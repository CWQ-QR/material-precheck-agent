import type { PrecheckResult } from "./types";

/**
 * 本地假数据：AI 预审接入前用于渲染报告页 UI。
 * 后续接入 AI 后，用 document_id 拉取真实结果替换此函数即可。
 */
export function getMockPrecheckResult(): PrecheckResult {
  return {
    overall: "conditional",
    issues: [
      {
        type: "missing",
        description: "缺少身份证复印件",
        suggestion: "请补充正反面复印件",
        source_quote: "要求：需提供身份证复印件",
      },
      {
        type: "mismatch",
        description: "申请日期与要求不符",
        suggestion: "请核对日期",
        source_quote: null,
      },
    ],
  };
}
