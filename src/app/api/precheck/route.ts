import { after } from "next/server";
import { streamObject } from "ai";
import {
  getDocumentFilePath,
  extractMaterialText,
} from "@/lib/extract-material";
import { markReportDone, markReportFailed } from "@/lib/reports-server";
import {
  buildPrecheckPrompt,
  generatePrecheckObject,
} from "@/lib/precheck-ai";
import { precheckModel } from "@/lib/ai";
import {
  MAX_MATERIAL_CHARS,
  PRECHECK_SYSTEM_PROMPT,
  precheckRequestSchema,
  precheckResultSchema,
} from "@/lib/precheck-schema";

// cacheComponents 模式下不允许导出 runtime（路由处理器默认即 Node 运行时）
// 最坏情况：断连兜底重跑（两轮 generateObject × SDK 各一次重试 × 单次 60s）≈ 240s
export const maxDuration = 300;

/** 单次流式生成的硬超时：正常十几秒内完成，超时后走 onError 落库 failed */
const STREAM_TIMEOUT_MS = 120_000;

/**
 * after() 兜底前等待流收尾的宽限期。
 * 响应正常结束时 onFinish 已先于 after() 执行完毕（几乎零等待）；
 * 客户端断开时流被取消、onFinish 不会触发，等待必然超时后转入重跑。
 */
const SETTLE_GRACE_MS = 10_000;

interface ErrorResponse {
  ok: false;
  error: string;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * POST /api/precheck
 * body: { document_id: string, requirements: string }
 *
 * 查文档 → 下载并提取材料文本 → AI 流式生成结构化预审结果（streamObject），
 * 以 text stream 形式返回给报告页做打字机渲染；
 * 流正常结束后在 onFinish 中把完整结构化结果写入 Supabase（status=done）。
 *
 * 落库可靠性设计（三层）：
 * 1. onFinish：流正常结束 → 校验通过写 done，schema 不合规写 failed；
 * 2. onError：流中途出错（网络/超时/限流）→ 写 failed；
 * 3. after()：客户端中途断开会级联 cancel 掉模型流（1、2 都不会触发），
 *    响应结束后检查仍未落库，则用非流式 generatePrecheckObject 重跑兜底，
 *    保证刷新/关页后报告页轮询永远能拿到终态。
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "请求体不是合法 JSON" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const parsed = precheckRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Response.json(
      {
        ok: false,
        error: firstIssue ? firstIssue.message : "请求参数不合法",
      } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const { document_id, requirements } = parsed.data;

  // a-b. 查出 file_path 并下载提取材料文本。此阶段失败直接落库 failed 并返回 500。
  let materialText: string;
  try {
    const filePath = await getDocumentFilePath(document_id);
    const fullText = await extractMaterialText(filePath);
    if (!fullText) {
      throw new Error("未能从材料中提取到文本，请确认文件内容清晰可读");
    }
    materialText = fullText.slice(0, MAX_MATERIAL_CHARS);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "预审过程中发生未知错误";
    console.error("[precheck] 材料提取失败:", message);

    await markReportFailed(document_id, message);

    return Response.json(
      { ok: false, error: message } satisfies ErrorResponse,
      { status: 500 }
    );
  }

  // ---- 流式生成 + 落库状态机 ----
  let settled = false;
  let resolveSettled: () => void = () => {};
  const settledPromise = new Promise<void>((resolve) => {
    resolveSettled = resolve;
  });

  /** 幂等落库：onFinish/onError/after 三方只有一个能真正写入 */
  const settle = async (persist: () => Promise<void>) => {
    if (settled) return;
    settled = true;
    try {
      await persist();
    } catch (error) {
      console.error(
        "[precheck] 报告状态写入失败:",
        error instanceof Error ? error.message : error
      );
    }
    resolveSettled();
  };

  const result = streamObject({
    model: precheckModel,
    schema: precheckResultSchema,
    schemaName: "PrecheckResult",
    system: PRECHECK_SYSTEM_PROMPT,
    temperature: 0,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
    prompt: buildPrecheckPrompt(requirements, materialText),
    onFinish: async (event) => {
      // event.object 已由 SDK 按 Zod Schema 校验；不合规时为 undefined，
      // 具体原因在 event.error（通常是 TypeValidationError）
      const validated = event.object
        ? precheckResultSchema.safeParse(event.object)
        : null;

      await settle(() =>
        validated?.success
          ? markReportDone(document_id, validated.data)
          : markReportFailed(
              document_id,
              event.error instanceof Error
                ? `AI 输出未通过格式校验：${event.error.message}`
                : "AI 输出未通过格式校验"
            )
      );
    },
    onError: async (event) => {
      const message =
        event.error instanceof Error
          ? event.error.message
          : "AI 流式生成过程中发生未知错误";
      console.error("[precheck] 流式生成错误:", message);

      await settle(() => markReportFailed(document_id, message));
    },
  });

  // 响应结束后兜底：正常完成时已落库（settled 短路，幂等）；
  // 客户端断开导致流被取消时，用非流式重跑，保证报告最终可查。
  after(async () => {
    await Promise.race([settledPromise, sleep(SETTLE_GRACE_MS)]);
    if (settled) return;

    console.warn(
      "[precheck] 检测到客户端提前断开，切换为非流式重跑:",
      document_id
    );
    try {
      const object = await generatePrecheckObject({
        requirements,
        materialText,
      });
      await markReportDone(document_id, object);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "预审过程中发生未知错误";
      console.error("[precheck] 断连重跑失败:", message);
      await markReportFailed(document_id, message);
    }
  });

  // text/plain 流：内容即模型输出的 JSON 文本增量，前端边收边做部分解析
  return result.toTextStreamResponse();
}
