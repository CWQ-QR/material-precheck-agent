/**
 * 全局共享类型定义
 */

/** 预审问题类型：missing=材料缺失，mismatch=信息矛盾/不一致 */
export type IssueType = "missing" | "mismatch";

/** 总体结论：pass=通过，conditional=条件通过，reject=不通过 */
export type OverallStatus = "pass" | "conditional" | "reject";

/** 单条预审问题 */
export interface PrecheckIssue {
  type: IssueType;
  /** 问题描述 */
  description: string;
  /** 修改建议 */
  suggestion: string;
  /** 原文依据，材料中未提及时为 null */
  source_quote: string | null;
}

/** 预审结果 */
export interface PrecheckResult {
  overall: OverallStatus;
  issues: PrecheckIssue[];
}

/** documents 表记录 */
export interface DocumentRecord {
  id: string;
  file_name: string;
  file_path: string;
  created_at?: string;
}
