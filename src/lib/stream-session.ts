/**
 * 上传页 → 报告页的「办事要求」传递桥。
 * 发起流式预审前存入 sessionStorage，报告页读取后用于调用 /api/precheck。
 * 材料文本始终由服务端按 document_id 自行提取，这里只存用户填写的小段要求文本。
 */

const STORAGE_KEY = "precheck-requirements";

export interface StoredRequirements {
  document_id: string;
  requirements: string;
}

/** 保存本次上传对应的办事要求（每次上传覆盖写入） */
export function saveRequirementsForStream(value: StoredRequirements): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 隐私模式等场景下 sessionStorage 不可用：流式入口读不到会自然回退轮询
  }
}

/** 读取指定文档的办事要求（SSR/隐私模式下返回 null） */
export function loadRequirementsForStream(
  documentId: string
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRequirements> | null;
    if (parsed?.document_id !== documentId || !parsed.requirements) {
      return null;
    }
    return parsed.requirements;
  } catch {
    return null;
  }
}
