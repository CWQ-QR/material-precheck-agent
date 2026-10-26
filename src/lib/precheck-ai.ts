import { generateObject } from "ai";
import { precheckModel } from "./ai";
import {
  PRECHECK_SYSTEM_PROMPT,
  precheckResultSchema,
  type PrecheckResult,
} from "./precheck-schema";

/** 最大尝试次数：首次 + 一次纠错重试 */
const MAX_ATTEMPTS = 2;

/**
 * 单次模型调用超时（毫秒），避免连接挂起导致报告永久 pending。
 * 正常响应通常在 30 秒内返回；最坏情况（2 轮 × SDK 各重试 1 次）总耗时约 240 秒，
 * 需小于路由的 maxDuration。
 */
const AI_CALL_TIMEOUT_MS = 60_000;

function buildPrompt(
  requirements: string,
  materialText: string,
  correctiveHint?: string
): string {
  return (
    "请对照「办事要求」预审「材料原文」，逐项判断是否缺失（missing）、" +
    "矛盾（mismatch）、格式不符（format）或表述歧义（ambiguous）。\n\n" +
    "必须只输出一个 JSON 对象，不要输出 JSON 以外的任何解释或 Markdown 代码块，结构如下（示例值仅为格式占位，需按真实预审结果填写）：\n" +
    '{"overall":"conditional","issues":[{"type":"missing","description":"问题的具体描述","suggestion":"针对性的修改建议","source_quote":null}]}\n' +
    "字段约束：\n" +
    "- overall 只能是 pass、conditional、reject 三者之一；\n" +
    "- issues 中每项必须且只能包含 type、description、suggestion、source_quote 四个键；\n" +
    "- type 只能是 missing、mismatch、format、ambiguous；\n" +
    "- source_quote 必须显式给出：是材料原文中的原句（字符串），材料未提及时必须为 null，禁止编造或填写占位文字；\n" +
    "- 没有发现任何问题时 issues 输出空数组 []。\n" +
    (correctiveHint ? `\n注意：你上一次的输出未通过格式校验（${correctiveHint}），请本次严格按要求重新输出合法 JSON。\n` : "\n") +
    `办事要求：\n"""\n${requirements}\n"""\n\n` +
    `材料原文：\n"""\n${materialText}\n"""`
  );
}

/**
 * 调用大模型生成结构化预审结果。
 * temperature=0 提升弱模型（glm-flash）输出稳定性；
 * 若 SDK 重试后仍因 schema 不合规失败，带纠错提示再尝试一次。
 */
export async function generatePrecheckObject(input: {
  requirements: string;
  materialText: string;
}): Promise<PrecheckResult> {
  const { requirements, materialText } = input;

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const { object } = await generateObject({
        model: precheckModel,
        schema: precheckResultSchema,
        schemaName: "PrecheckResult",
        system: PRECHECK_SYSTEM_PROMPT,
        temperature: 0,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(AI_CALL_TIMEOUT_MS),
        prompt: buildPrompt(
          requirements,
          materialText,
          attempt > 1 && lastError instanceof Error
            ? lastError.message
            : undefined
        ),
      });
      return object;
    } catch (error) {
      lastError = error;
      console.error(
        `[precheck] 第 ${attempt}/${MAX_ATTEMPTS} 次 AI 生成失败:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  throw lastError instanceof Error
    ? new Error(`AI 结果生成失败：${lastError.message}`)
    : new Error("AI 结果生成失败：未知错误");
}
