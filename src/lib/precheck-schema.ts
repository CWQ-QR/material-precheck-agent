import { z } from "zod";

/**
 * 预审结果的 Zod Schema —— AI generateObject 的唯一事实来源，
 * 同时用于校验 reports.result 中读取回来的数据。
 */
export const precheckIssueSchema = z.object({
  /** missing=材料缺失，mismatch=信息矛盾，format=格式不符，ambiguous=表述歧义 */
  type: z.enum(["missing", "mismatch", "format", "ambiguous"]),
  description: z.string(),
  suggestion: z.string(),
  /**
   * 材料原文中的依据，未提及时为 null。
   * 弱模型可能漏写该键或返回空串：可选输入统一归一化为 null，
   * 解析后的输出类型仍为 string | null。
   */
  source_quote: z
    .string()
    .nullable()
    .optional()
    .transform((value) =>
      value === undefined || value === null || value.trim() === ""
        ? null
        : value
    ),
});

export const precheckResultSchema = z.object({
  overall: z.enum(["pass", "conditional", "reject"]),
  issues: z.array(precheckIssueSchema),
});

export type PrecheckIssue = z.infer<typeof precheckIssueSchema>;
export type PrecheckResult = z.infer<typeof precheckResultSchema>;
export type IssueType = PrecheckIssue["type"];
export type OverallStatus = PrecheckResult["overall"];

/** /api/precheck 请求体校验 */
export const precheckRequestSchema = z.object({
  document_id: z.string().trim().min(1, "缺少 document_id"),
  requirements: z.string().trim().min(1, "请填写办事要求"),
});

export type PrecheckRequest = z.infer<typeof precheckRequestSchema>;

/** 预审员系统提示词：严格基于材料，禁止编造 */
export const PRECHECK_SYSTEM_PROMPT =
  "你是严谨的办事材料预审员。只基于提供的材料作答，绝不编造。" +
  "如果材料未提及要求，source_quote 必须为 null，" +
  "并在 description 中写明‘原文未提及，请人工核对’。";

/** 送入模型的材料文本最大字符数，防止超出上下文窗口 */
export const MAX_MATERIAL_CHARS = 20000;
