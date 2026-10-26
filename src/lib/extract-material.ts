import { supabaseAdmin } from "./supabase-admin";
import { MATERIALS_BUCKET } from "./materials";

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

/**
 * 从 Storage 下载材料并提取纯文本。
 * - PDF：pdf-parse（PDF.js）解析
 * - 文本文件：直接按 UTF-8 读取
 * - 图片等其它类型：当前模型不支持视觉，抛出明确错误
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
    // 动态引入 + next.config 中标记 serverExternalPackages，
    // 避免 pdf.js / @napi-rs/canvas 等 Node 原生依赖被打包进路由 bundle。
    const { PDFParse } = await import("pdf-parse");
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

  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) {
    throw new Error(
      "暂不支持图片材料的自动预审，请上传 PDF 或文本文件（图片识别能力即将上线）"
    );
  }

  throw new Error("不支持的文件类型，请上传 PDF 或文本文件");
}
