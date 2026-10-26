import { supabaseAdmin } from "./supabase-admin";
import { normalizeReportRow, type ReportRow } from "./report-snapshot";
import type { PrecheckResult, ReportSnapshot } from "./types";

/** 服务端：按 document_id 查询报告快照（service role 绕过 RLS） */
export async function getReportSnapshotServer(
  documentId: string
): Promise<ReportSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("id,document_id,status,result,created_at")
    .eq("document_id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(`报告查询失败：${error.message}`);
  }

  return normalizeReportRow((data as ReportRow | null) ?? null);
}

/** 服务端：写入预审结论，status 置为 done */
export async function markReportDone(
  documentId: string,
  result: PrecheckResult
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("reports")
    .update({ status: "done", result })
    .eq("document_id", documentId);

  if (error) {
    throw new Error(`报告结果写入失败：${error.message}`);
  }
}

/**
 * 服务端：标记预审失败。
 * reports 表没有 error_message 列，失败原因存入 result jsonb。
 */
export async function markReportFailed(
  documentId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("reports")
    .update({
      status: "failed",
      result: { error_message: errorMessage },
    })
    .eq("document_id", documentId);

  if (error) {
    // 此处失败通常意味着记录本身不存在，仅记录日志，避免掩盖原始错误
    console.error("[precheck] failed 状态写入失败:", error.message);
  }
}
