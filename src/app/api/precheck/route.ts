import {
  getDocumentFilePath,
  extractMaterialText,
} from "@/lib/extract-material";
import { markReportDone, markReportFailed } from "@/lib/reports-server";
import { generatePrecheckObject } from "@/lib/precheck-ai";
import {
  MAX_MATERIAL_CHARS,
  precheckRequestSchema,
} from "@/lib/precheck-schema";

// cacheComponents 模式下不允许导出 runtime（路由处理器默认即 Node 运行时）
// 最坏情况：两轮 generateObject × SDK 各一次重试 × 单次 60s 超时 ≈ 240s
export const maxDuration = 300;

interface SuccessResponse {
  ok: true;
  document_id: string;
}

interface ErrorResponse {
  ok: false;
  error: string;
}

/**
 * POST /api/precheck
 * body: { document_id: string, requirements: string }
 *
 * 查文档 → 下载并提取材料文本 → AI 结构化预审 → 回写 reports 表。
 * 任何业务失败都会把 reports.status 置为 failed 并返回 500。
 */
export async function POST(
  request: Request
): Promise<Response> {
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

  try {
    // a. 根据 document_id 查出 file_path
    const filePath = await getDocumentFilePath(document_id);

    // b. 下载文件，PDF/文本提取纯文本
    const fullText = await extractMaterialText(filePath);
    if (!fullText) {
      throw new Error("未能从材料中提取到文本，请确认文件内容清晰可读");
    }
    const materialText =
      fullText.length > MAX_MATERIAL_CHARS
        ? fullText.slice(0, MAX_MATERIAL_CHARS)
        : fullText;

    // c-e. 调用大模型生成符合 Zod Schema 的结构化预审结果。
    // 智谱不支持 strict json_schema，输出结构通过提示词中的 JSON 契约约束，
    // 返回后仍由 Zod Schema 做最终校验；glm-flash 偶发不合规，纠错重试一次。
    const object = await generatePrecheckObject({
      requirements,
      materialText,
    });

    // f. 结果回写 reports 表，status=done
    await markReportDone(document_id, object);

    return Response.json(
      { ok: true, document_id } satisfies SuccessResponse,
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "预审过程中发生未知错误";
    console.error("[precheck] 预审失败:", message);

    await markReportFailed(document_id, message);

    return Response.json(
      { ok: false, error: message } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
