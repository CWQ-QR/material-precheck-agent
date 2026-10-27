import { generateObject, generateText } from "ai";
import { precheckModel, visionModel } from "./ai";
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

/** 视觉模型单次提取允许的最大图片体积（glm-4v-flash 限制 base64 前约 5MB） */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** 图片 OCR 指令：只要文字，不要解读 */
const IMAGE_EXTRACT_PROMPT =
  "请提取这张图片中的全部文字内容，保持原有排版格式输出，不要做任何总结或解释。";

/**
 * 构建预审提示词（JSON 契约）。
 * 流式（streamObject）与非流式（generateObject）共用，保证输出结构一致；
 * correctiveHint 仅用于非流式的纠错重试。
 */
export function buildPrecheckPrompt(
  requirements: string,
  materialText: string,
  correctiveHint?: string
): string {
  return (
    "请对比【办事要求】与【材料原文】，以办事群众协助者的身份逐项判断材料是否缺失（missing）、" +
    "矛盾（mismatch）、格式不符（format）或表述歧义（ambiguous）。\n\n" +
    "必须只输出一个 JSON 对象，不要输出 JSON 以外的任何解释或 Markdown 代码块，结构如下（示例值仅为格式占位，需按真实预审结果填写）：\n" +
    '{"document_type":"居住证办理材料","overall":"conditional","issues":[{"type":"missing","description":"问题的具体描述","suggestion":"针对性的修改建议","source_quote":null}]}\n' +
    "字段约束：\n" +
    "- document_type 的识别必须精准客观：零散的文字片段要如实分类为「身份信息片段」「零散文本」「申请表局部」等具体描述，绝对不允许将残缺片面的文件概括为完整的办理材料（例如：仅包含一段身份证号的文本只能写「身份信息片段」，不能写「居住证办理材料」）；\n" +
    "- overall 只能是 pass、conditional、reject 三者之一；\n" +
    "- 判定纪律：若材料与办事要求完全无关（文不对题），或核心材料全部严重缺失，overall 必须为 reject，绝不给 conditional 或 pass；\n" +
    "- issues 中每项必须且只能包含 type、description、suggestion、source_quote 四个键；\n" +
    "- type 只能是 missing、mismatch、format、ambiguous；\n" +
    "- description 的硬性要求：当材料为零散片段或仅包含部分信息时，description 必须首先明确指出材料不完整，且必须包含「材料不完整」或「仅包含部分信息」字样（句式参考：「材料不完整，仅包含身份信息片段，缺少…」），绝不能默认用户已经提供了完整文件；\n" +
    "- suggestion 必须从申请人角度出发（如：您需要补充提供身份证原件及复印件），禁止以办事窗口或通知起草方口吻表述；\n" +
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
        prompt: buildPrecheckPrompt(
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

/**
 * 调用智谱视觉模型从图片材料中提取文字（OCR）。
 * 图片转为 base64 data URL 以多模态消息传入，提取结果作为后续预审的 materialText。
 */
export async function extractTextFromImage(
  blob: Blob,
  mimeType: string
): Promise<string> {
  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error("图片文件过大，请上传 5MB 以内的图片材料");
  }
  if (!mimeType.startsWith("image/")) {
    throw new Error("文件不是有效的图片格式");
  }

  const buffer = new Uint8Array(await blob.arrayBuffer());
  const dataUrl = `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;

  try {
    const { text } = await generateText({
      model: visionModel,
      temperature: 0,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(AI_CALL_TIMEOUT_MS),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: IMAGE_EXTRACT_PROMPT },
            { type: "image", image: dataUrl },
          ],
        },
      ],
    });
    return text.trim();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "未知错误";
    throw new Error(`图片文字提取失败：${message}`);
  }
}
