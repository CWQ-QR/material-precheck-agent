import { supabase } from "./supabase";
import { normalizeReportRow, type ReportRow } from "./report-snapshot";
import type { ReportSnapshot } from "./types";

/** 上传完成后创建一条 pending 报告记录，返回报告记录 id */
export async function createPendingReport(
  documentId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      document_id: documentId,
      status: "pending",
      result: null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`预审任务创建失败：${error.message}`);
  }

  const row = data as { id: string } | null;
  if (!row?.id) {
    throw new Error("预审任务创建失败：服务端未返回记录 id");
  }

  return row.id;
}

/** 按 document_id 查询报告快照（供报告页轮询使用，走 anon + RLS） */
export async function fetchReportSnapshot(
  documentId: string
): Promise<ReportSnapshot | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("id,document_id,status,result,created_at")
    .eq("document_id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(`报告查询失败：${error.message}`);
  }

  return normalizeReportRow((data as ReportRow | null) ?? null);
}
