import { precheckResultSchema } from "./precheck-schema";
import type { ReportSnapshot, ReportStatus } from "./types";

/** reports 表一行原始记录（result 为未校验的 jsonb） */
export interface ReportRow {
  id: string;
  document_id: string;
  status: ReportStatus;
  result: unknown;
  created_at?: string;
}

/**
 * 把 reports 原始行归一化为前端快照：
 * done 时用 Zod 校验 result；failed 时从 result.error_message 取失败原因。
 */
export function normalizeReportRow(
  row: ReportRow | null
): ReportSnapshot | null {
  if (!row) return null;

  if (row.status === "done") {
    const parsed = precheckResultSchema.safeParse(row.result);
    if (parsed.success) {
      return { status: "done", result: parsed.data, errorMessage: null };
    }
    return {
      status: "failed",
      result: null,
      errorMessage: "报告数据格式异常，请重新预审",
    };
  }

  if (row.status === "failed") {
    const result = row.result as { error_message?: unknown } | null;
    const errorMessage =
      typeof result?.error_message === "string"
        ? result.error_message
        : "预审失败，请稍后重试";
    return { status: "failed", result: null, errorMessage };
  }

  return { status: "pending", result: null, errorMessage: null };
}
