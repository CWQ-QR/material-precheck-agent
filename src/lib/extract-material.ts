import { supabaseAdmin } from "./supabase-admin";
import { MATERIALS_BUCKET } from "./materials";
import { extractTextFromImage } from "./precheck-ai";

/** 根据 document_id 查询 Storage 文件路径 */
export async function getDocumentFilePath(
  documentId: string
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("file_path")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(`文档记录查询失败：${error.message}`);
  }

  const row = data as { file_path: string } | null;
  if (!row?.file_path) {
    throw new Error("未找到该文档记录，请重新上传材料");
  }

  return row.file_path;
}

/** 可直接提取文本的纯文本后缀 */
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "log",
  "text",
]);

function getExtension(filePath: string): string {
  const dotIndex = filePath.lastIndexOf(".");
  return dotIndex >= 0 ? filePath.slice(dotIndex + 1).toLowerCase() : "";
}

/** 图片后缀 → MIME 类型（blob.type 缺失时兜底） */
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

/**
 * 从 Storage 下载材料并提取纯文本。
 * - PDF：pdf-parse（PDF.js）解析
 * - 图片：视觉模型 OCR 提取文字
 * - 文本文件：直接按 UTF-8 读取
 */
export async function extractMaterialText(filePath: string): Promise<string> {
  const { data: blob, error } = await supabaseAdmin.storage
    .from(MATERIALS_BUCKET)
    .download(filePath);

  if (error || !blob) {
    throw new Error(`材料文件下载失败：${error?.message ?? "文件不存在"}`);
  }

  const ext = getExtension(filePath);
  const mimeType = blob.type;

  if (ext === "pdf" || mimeType === "application/pdf") {
    // 不用动态 import：Turbopack 对 serverExternalPackages 的运行时
    // junction 机制在 Windows 上不稳定（断链/EPERM）。
    // 改用 createRequire 让 Node 直接从项目 node_modules 解析，
    // 完全绕开 [turbopack]_runtime 的外部模块加载。
    const { createRequire } = await import("node:module");
    const nodeRequire = createRequire(import.meta.url);
    const { PDFParse } = nodeRequire("pdf-parse") as typeof import("pdf-parse");
    const parser = new PDFParse({
      data: new Uint8Array(await blob.arrayBuffer()),
    });

    try {
      const result = await parser.getText({ pageJoiner: "\n\n" });
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  if (TEXT_EXTENSIONS.has(ext) || mimeType.startsWith("text/")) {
    return (await blob.text()).trim();
  }

  const imageMime =
    IMAGE_MIME_BY_EXTENSION[ext] ??
    (mimeType.startsWith("image/") ? mimeType : null);

  if (imageMime) {
    return extractTextFromImage(blob, imageMime);
  }

  throw new Error("不支持的文件类型，请上传 PDF、图片或文本文件");
}
