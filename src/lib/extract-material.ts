import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  getSupabaseAdmin,
  SUPABASE_ADMIN_NOT_CONFIGURED_MESSAGE,
} from "./supabase-admin";
import { MATERIALS_BUCKET } from "./materials";
import { extractTextFromImage } from "./precheck-ai";

/**
 * 以原生 import() 加载运行时模块，绕开打包器对动态路径的静态分析
 * （否则构建期会报 "Can't resolve <dynamic>"、运行期报 expression too dynamic）。
 */
const nativeImport = new Function(
  "specifier",
  // 拆开写 "im" + "port"：避免打包器改写源码里的 import 关键字
  ["return", "im" + "port", "(specifier)"].join(" ")
) as (specifier: string) => Promise<any>;

/** 从项目 node_modules 按需原生加载一个模块 */
async function importFromNodeModules(relativePath: string): Promise<any> {
  const entry = path.join(process.cwd(), "node_modules", relativePath);
  return nativeImport(pathToFileURL(entry).href);
}

/**
 * pdf-parse 官方在 Serverless 环境下的加载方案：
 * 先加载它的 worker 模块（注入 DOMMatrix / ImageData / Path2D 并注册内联
 * pdf.js worker），再加载解析器，避免线上报 "DOMMatrix is not defined"。
 *
 * 这里不用文件顶层的 `import "pdf-parse/worker"`：本项目 Next 16 + Turbopack
 * 会把 serverExternalPackages 里的包改写成 "pdf-parse-<hash>/worker"，
 * 构建收集页面数据时报 ERR_MODULE_NOT_FOUND。改为运行时从 node_modules
 * 原生加载，效果相同且不经过打包器。
 */
async function loadPdfParse(): Promise<any> {
  await importFromNodeModules(
    path.join("pdf-parse", "dist", "worker", "esm", "index.js")
  );
  return importFromNodeModules(
    path.join("pdf-parse", "dist", "pdf-parse", "esm", "index.js")
  );
}

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
 * - PDF：pdf-parse（配合 pdf-parse/worker 的 Serverless 方案）解析
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
    try {
      const { PDFParse } = await loadPdfParse();
      const parser = new PDFParse({
        data: new Uint8Array(await blob.arrayBuffer()),
      });

      try {
        const result = await parser.getText({ pageJoiner: "\n\n" });
        return result.text.trim();
      } finally {
        // 释放解析器资源，避免 Serverless 实例内存泄漏
        await parser.destroy();
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
