import {
  getSupabaseAdmin,
  SUPABASE_ADMIN_NOT_CONFIGURED_MESSAGE,
} from "./supabase-admin";
import { MATERIALS_BUCKET } from "./materials";
import { extractTextFromImage } from "./precheck-ai";

/** 根据 document_id 查询 Storage 文件路径 */
export async function getDocumentFilePath(
  documentId: string
): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    throw new Error(SUPABASE_ADMIN_NOT_CONFIGURED_MESSAGE);
  }

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
 * - PDF：pdfjs-serverless（服务端裁剪版 PDF.js）解析
 * - 图片：视觉模型 OCR 提取文字
 * - 文本文件：直接按 UTF-8 读取
 */
export async function extractMaterialText(filePath: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    throw new Error(SUPABASE_ADMIN_NOT_CONFIGURED_MESSAGE);
  }

  const { data: blob, error } = await supabaseAdmin.storage
    .from(MATERIALS_BUCKET)
    .download(filePath);

  if (error || !blob) {
    throw new Error(`材料文件下载失败：${error?.message ?? "文件不存在"}`);
  }

  const ext = getExtension(filePath);
  const mimeType = blob.type;

  if (ext === "pdf" || mimeType === "application/pdf") {
    // pdfjs-serverless 是面向边缘/无服务器运行时分发的 PDF.js 构建，
    // 不依赖 DOMMatrix、canvas 等浏览器 API。
    // 动态导入：仅解析 PDF 时才加载这份较大的 PDF.js 产物。
    try {
      const { resolvePDFJS } = await import("pdfjs-serverless");
      const { getDocument } = await resolvePDFJS();
      const loadingTask = getDocument({
        data: new Uint8Array(await blob.arrayBuffer()),
      });
      const doc = await loadingTask.promise;

      try {
        let fullText = "";
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          fullText += pageText + "\n";
        }
        return fullText.trim();
      } finally {
        // 释放 worker/传输层资源，避免 Serverless 实例内存泄漏
        await loadingTask.destroy();
      }
    } catch (error) {
      console.error("[extract-material] PDF 解析失败:", error);
      throw new Error("PDF解析失败，请检查文件格式或稍后重试");
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
