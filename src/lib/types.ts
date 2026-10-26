/**
 * 全局共享类型定义。
 * 预审结果类型由 Zod Schema 推导，保证「AI 输出 ↔ 数据库 ↔ UI」类型闭环。
 */
import type { PrecheckResult } from "./precheck-schema";

export type {
  PrecheckResult,
  PrecheckIssue,
  IssueType,
  OverallStatus,
} from "./precheck-schema";

/** documents 表记录 */
export interface DocumentRecord {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at?: string;
}

/** reports 表状态 */
export type ReportStatus = "pending" | "done" | "failed";

/**
 * 前端消费的报告快照（已把 result jsonb 解析成强类型）。
 * null 表示该 document 尚无报告记录。
 */
export interface ReportSnapshot {
  status: ReportStatus;
  result: PrecheckResult | null;
  /** 失败原因：status=failed 时存在（存储在 result.error_message 中） */
  errorMessage: string | null;
}
