import { getSupabaseAdmin, SUPABASE_ADMIN_NOT_CONFIGURED_MESSAGE } from "./supabase-admin";
import { MATERIALS_BUCKET } from "./materials";
import { extractTextFromImage } from "./precheck-ai";

// 根据 document_id 查询 Storage 文件路径
export async function getDocumentFilePath(documentId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) throw new Error(SUPABASE_ADMIN_NOT_CONFIGURED_MESSAGE);

  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("file_path")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw new Error(`文档记录查询失败：${error.message}`);
  
  const row = data as { file_path: string } | null;
  if (!row?.file_path) throw new Error("未找到该文档记录，请重新上传材料");

  return row.file_path;
}

// 提取文本的主函数
export async function extractMaterialText(filePath: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) throw new Error(SUPABASE_ADMIN_NOT_CONFIGURED_MESSAGE);

  const { data: blob, error } = await supabaseAdmin.storage
    .from(MATERIALS_BUCKET)
    .download(filePath);

  if (error || !blob) {
    throw new Error(`材料文件下载失败：${error?.message ?? "文件不存在"}`);
  }

  // 获取文件后缀和 MIME 类型
  const dotIndex = filePath.lastIndexOf(".");
  const ext = dotIndex >= 0 ? filePath.slice(dotIndex + 1).toLowerCase() : "";
  const mimeType = blob.type;


  if (ext === "pdf" || mimeType === "application/pdf") {
    throw new Error("PDF 解析已移至前端，请刷新页面重新上传");
  }

  // 2. 如果是纯文本文件，直接读取
  const textExtensions = ["txt", "md", "csv", "json", "log", "text"];
  if (textExtensions.includes(ext) || mimeType.startsWith("text/")) {
    return (await blob.text()).trim();
  }

  // 3. 如果是图片，走 OCR 逻辑
  const isImage = mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);
  if (isImage) {
    return extractTextFromImage(blob, mimeType || "image/jpeg");
  }

  throw new Error("不支持的文件类型，请上传 PDF、图片或文本文件");
}