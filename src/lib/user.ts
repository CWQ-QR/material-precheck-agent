/**
 * 轻量级设备标识隔离：不引入账号体系，仅用 localStorage 区分设备。
 * - device_id：首次访问时用 crypto.randomUUID() 生成并持久保存；
 * - my_documents：本设备上传过的 document_id 列表，
 *   工作台据此过滤查询，实现"不同设备只看到自己的历史记录"。
 */

const DEVICE_ID_KEY = "device_id";
const MY_DOCUMENTS_KEY = "my_documents";

/** 读取（或首次生成并持久化）设备标识。SSR 环境返回空串 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage 不可用（隐私模式等）时返回空串，仅影响设备标识
    return "";
  }
}

/** 读取本设备上传过的 document_id 列表。SSR/异常时返回空数组 */
export function getMyDocuments(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MY_DOCUMENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

/**
 * 上传成功后登记 document_id（去重，最新在后）。
 * 顺确保 device_id 已初始化（首次上传时生成设备标识）。
 */
export function addMyDocument(documentId: string): void {
  if (typeof window === "undefined") return;
  try {
    getDeviceId();
    const ids = getMyDocuments();
    if (!ids.includes(documentId)) {
      ids.push(documentId);
      window.localStorage.setItem(MY_DOCUMENTS_KEY, JSON.stringify(ids));
    }
  } catch {
    // localStorage 不可用时静默忽略：仅影响工作台历史，不影响核心流程
  }
}
