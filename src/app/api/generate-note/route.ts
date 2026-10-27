import { z } from "zod";
import { generateText } from "ai";
import { chatModel } from "@/lib/ai";
import { precheckIssueSchema } from "@/lib/precheck-schema";

// cacheComponents 模式下不允许导出 runtime；单次 generateText 60s 超时 + SDK 重试 1 次
export const maxDuration = 150;

const ISSUE_TYPE_LABELS = {
  missing: "材料缺失",
  mismatch: "信息矛盾",
  format: "格式不符",
  ambiguous: "表述歧义",
} as const;

const generateNoteRequestSchema = z.object({
  issues: z
    .array(precheckIssueSchema)
    .min(1, "问题列表不能为空")
    .max(20, "问题数量超出限制"),
});

/** 与预审接口一致的 AI 故障友好化映射 */
const BUSY_ERROR_PATTERN =
  /繁忙|限流|rate|429|503|timeout|timed?\s*out|超时|econn|enet|socket\s*hang|fetch\s*failed|network|aborted|aborterror|overloaded/i;

function formatIssue(index: number, issue: z.infer<typeof precheckIssueSchema>): string {
  const lines = [
    `${index + 1}. 【${ISSUE_TYPE_LABELS[issue.type]}】${issue.description}`,
    `   修改建议：${issue.suggestion}`,
  ];
  if (issue.source_quote) {
    lines.push(`   原文依据：${issue.source_quote}`);
  }
  return lines.join("\n");
}

interface NoteResponse {
  ok: true;
  note: string;
}

interface ErrorResponse {
  ok: false;
  error: string;
}

/**
 * POST /api/generate-note
 * body: { issues: PrecheckIssue[] }
 *
 * 根据预审问题列表生成一段可直接发给办事窗口的补正说明（纯文本，不入库）。
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

  const parsed = generateNoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Response.json(
      { ok: false, error: firstIssue ? firstIssue.message : "请求参数不合法" },
      { status: 400 }
    );
  }

  const { issues } = parsed.data;
  const issueList = issues
    .map((issue, index) => formatIssue(index, issue))
    .join("\n");

  try {
    const { text } = await generateText({
      model: chatModel,
      system:
        "你是一个办事协助专家。请根据用户提供的材料问题列表，" +
        "帮用户写一段发给办事窗口工作人员的补正说明。" +
        "要求：态度诚恳礼貌，条理清晰地列出发现的问题及补充计划，" +
        "不要长篇大论。直接输出文本即可。",
      temperature: 0.4,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(60_000),
      prompt: `请根据以下材料问题列表，撰写补正说明：\n\n${issueList}`,
    });

    const note = text.trim();
    if (!note) {
      throw new Error("AI 未返回有效内容");
    }

    return Response.json(
      { ok: true, note } satisfies NoteResponse,
      { status: 200 }
    );
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "生成过程中发生未知错误";
    const message = BUSY_ERROR_PATTERN.test(rawMessage)
      ? "AI 预审服务繁忙，请稍后重试"
      : rawMessage;
    console.error("[generate-note] 补正说明生成失败:", rawMessage);

    return Response.json(
      { ok: false, error: message } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
