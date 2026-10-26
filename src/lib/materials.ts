import { supabase } from "./supabase";

/** Storage 中存放办事材料的桶名 */
export const MATERIALS_BUCKET = "materials";

/**
 * 允许上传的文件类型：PDF + 纯文本。
 * 当前模型（glm-4-flash）不支持视觉，图片会在预审阶段被拒绝。
 */
const ACCEPTED_FILE_TYPES =
  ".pdf,.txt,.md,.csv,.json,.log,text/*,application/json";

/** 可直接提取文本的后缀白名单（与服务端 extract-material 保持一致） */
const TEXT_FILE_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "log",
  "text",
]);

/** 文件大小上限 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export { ACCEPTED_FILE_TYPES };

function isPdfFile(file: File, ext: string): boolean {
  return ext === "pdf" || file.type === "application/pdf";
}

function isTextFile(file: File, ext: string): boolean {
  return (
    TEXT_FILE_EXTENSIONS.has(ext) ||
    file.type.startsWith("text/") ||
    file.type === "application/json"
  );
}

/** 校验文件类型与大小，不合法时抛出带中文提示的错误 */
export function assertAcceptedFile(file: File): void {
  const dotIndex = file.name.lastIndexOf(".");
  const ext =
    dotIndex >= 0
      ? file.name.slice(dotIndex + 1).toLowerCase()
      : "";

  if (!isPdfFile(file, ext) && !isTextFile(file, ext)) {
    throw new Error("仅支持 PDF 或文本文件（TXT/MD/CSV/JSON/LOG），暂不支持图片");
  }
  if (file.size === 0) {
    throw new Error("文件内容为空，请重新选择");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("文件大小不能超过 10MB");
  }
}

/** Storage 路径中允许的字符：仅字母、数字、连字符、下划线、点 */
const STORAGE_SAFE_PATH_PATTERN = /^[A-Za-z0-9._-]+$/;

/** 无后缀文件按 MIME 类型兜底推导后缀（仅覆盖 PDF 与常见文本类型） */
const MIME_FALLBACK_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/json": "json",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
};

/**
 * 提取文件后缀（小写、纯字母数字）。
 * 文件名无合法后缀时，按 MIME 类型兜底，最终兜底为 bin。
 */
function extractExtension(file: File): string {
  const dotIndex = file.name.lastIndexOf(".");
  if (dotIndex >= 0 && dotIndex < file.name.length - 1) {
    const ext = file.name
      .slice(dotIndex + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    if (ext) return ext;
  }
  return MIME_FALLBACK_EXTENSIONS[file.type] ?? "bin";
}

/**
 * 生成 Storage 中的唯一文件路径：
 * `${时间戳}-${UUID}.${后缀}`，不使用原始文件名，
 * 确保路径仅包含字母、数字、连字符（-）、下划线（_）和点（.），
 * 避免中文/空格等字符导致 "Invalid path specified in request URL"。
 */
export function buildStoragePath(file: File): string {
  const uniqueId =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2, 10);
  const ext = extractExtension(file);
  const filePath = `${Date.now()}-${uniqueId}.${ext}`;

  if (!STORAGE_SAFE_PATH_PATTERN.test(filePath)) {
    throw new Error("生成的文件路径包含非法字符");
  }

  return filePath;
}

/** 将文件上传到 materials 桶，返回桶内文件路径 */
export async function uploadMaterial(file: File): Promise<string> {
  assertAcceptedFile(file);

  const filePath = buildStoragePath(file);
  const { error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`文件上传失败：${error.message}`);
  }

  return filePath;
}

/** 在 documents 表登记一条记录，返回新生成的 document_id */
export async function registerDocument(input: {
  fileName: string;
  filePath: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      file_name: input.fileName,
      file_path: input.filePath,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`文档记录创建失败：${error.message}`);
  }

  const row = data as { id: string } | null;
  if (!row?.id) {
    throw new Error("文档记录创建失败：服务端未返回 document_id");
  }

  return row.id;
}
