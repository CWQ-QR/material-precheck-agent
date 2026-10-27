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
  /** AI 识别出的材料类型（如：居住证办理材料、大赛报名表）。
   * 旧报告记录可能没有该字段，统一归一化为「未知文档」 */
  document_type: z
    .string()
    .nullish()
    .transform((value) =>
      typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : "未知文档"
    ),
  overall: z.enum(["pass", "conditional", "reject"]),
  issues: z.array(precheckIssueSchema),
});

export type PrecheckIssue = z.infer<typeof precheckIssueSchema>;
export type PrecheckResult = z.infer<typeof precheckResultSchema>;
export type IssueType = PrecheckIssue["type"];
export type OverallStatus = PrecheckResult["overall"];

/**
 * 流式渲染用的部分 Schema：streamObject 产出的 JSON 是逐步到齐的，
 * 客户端每收到一段文本就用它对「修复后的部分 JSON」做校验，
 * 只保留已生成且合法的字段（DeepPartial 语义），未到的字段交给骨架屏。
 */
export const precheckPartialIssueSchema = z.object({
  type: precheckIssueSchema.shape.type.optional(),
  description: z.string().optional(),
  suggestion: z.string().optional(),
  source_quote: precheckIssueSchema.shape.source_quote.optional(),
});

export const precheckPartialResultSchema = z.object({
  document_type: z.string().optional(),
  overall: precheckResultSchema.shape.overall.optional(),
  issues: z.array(precheckPartialIssueSchema).optional(),
});

export type PrecheckPartialIssue = z.infer<typeof precheckPartialIssueSchema>;
export type PrecheckPartialResult = z.infer<
  typeof precheckPartialResultSchema
>;

/** /api/precheck 请求体校验 */
export const precheckRequestSchema = z.object({
  document_id: z.string().trim().min(1, "缺少 document_id"),
  requirements: z.string().trim().min(1, "请填写办事要求"),
});

export type PrecheckRequest = z.infer<typeof precheckRequestSchema>;

/** 预审员系统提示词：协助者身份 + 严格判定纪律，禁止编造 */
export const PRECHECK_SYSTEM_PROMPT =
  "你是「办事群众的材料协助者」，帮助申请人（办事群众）在正式提交前自查办事材料。" +
  "你对比的对象只有两个：【办事要求】和【用户上传的材料】。你永远站在申请人一边，" +
  "绝不以办事窗口工作人员或通知起草方的口吻说话，输出中禁止出现指导对方完善通知、完善要求之类的表述。" +
  "判定必须严格遵循以下三步：" +
  "第一步，先识别材料类型 document_type（如：居住证办理材料、大赛报名表、小说章节、毕业证书扫描件）；" +
  "第二步，如果材料与办事要求完全无关（文不对题），或者要求的核心材料全部严重缺失，" +
  "overall 必须直接判定为 reject，绝不给 conditional 或 pass；" +
  "第三步，所有 suggestion 都从申请人角度出发，使用「您需要补充提供…」「您需要更换…」的措辞。" +
  "材料类型（document_type）的识别必须精准客观。如果是零散的文字片段，" +
  "请如实地分类为「身份信息片段」「零散文本」「申请表局部」等具体描述，" +
  "绝对不允许将残缺片面的文件概括为完整的办理材料。" +
  "相应地，issues 的 description 中必须明确指出材料不完整或仅包含部分信息，不能默认用户已经提供了完整文件。" +
  "只基于材料本身作答，绝不编造。" +
  "如果材料未提及要求项，source_quote 必须为 null，" +
  "并在 description 中写明‘原文未提及，请人工核对’。";

/** 送入模型的材料文本最大字符数，防止超出上下文窗口 */
export const MAX_MATERIAL_CHARS = 20000;
