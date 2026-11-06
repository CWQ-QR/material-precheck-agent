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
 * 注入 pdfjs 需要的浏览器 API（服务端运行时没有 DOMMatrix 等）。
 * 必须在加载 pdfjs-dist 之前调用。
 *
 * @napi-rs/canvas 是原生模块，不能被打包器处理；
 * 这里在运行时从 node_modules 直接加载，只在解析 PDF 时执行一次。
 */
async function ensurePdfjsPolyfills(): Promise<void> {
  if (typeof (globalThis as any).DOMMatrix !== "undefined") return;

  const canvas = (await importFromNodeModules(
    path.join("@napi-rs", "canvas", "index.js")
  )) as { DOMMatrix: unknown; ImageData: unknown; Path2D: unknown };

  (globalThis as any).DOMMatrix = canvas.DOMMatrix;
  (globalThis as any).ImageData = canvas.ImageData;
  (globalThis as any).Path2D = canvas.Path2D;
}

/**
 * 加载 pdfjs-dist 的 legacy 构建（对 Node.js 兼容性更好）。
 * 直接从 node_modules 以 file:// URL 原生导入，
 * 避免打包器把这份 PDF.js 产物打进 bundle 或改写成外部包目录。
 */
async function loadPdfjs(): Promise<any> {
  return importFromNodeModules(
    path.join("pdfjs-dist", "legacy", "build", "pdf.mjs")
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
 * - PDF：pdfjs-dist（legacy 构建 + @napi-rs/canvas Polyfill）解析
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
    // 使用 pdfjs-dist 的 legacy 构建（对 Node.js 兼容性更好），
    // 并配合上方 @napi-rs/canvas 注入的浏览器 API Polyfill。
    // 动态导入：仅解析 PDF 时才加载这份较大的 PDF.js 产物。
    try {
      await ensurePdfjsPolyfills();
      const pdfjsLib = await loadPdfjs();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(await blob.arrayBuffer()),
        useWorkerFetch: false,
        useSystemFonts: true,
      });
      const pdfDocument = await loadingTask.promise;
      let fullText = "";

      try {
        for (let i = 1; i <= pdfDocument.numPages; i++) {
          const page = await pdfDocument.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: { str?: string }) => item.str ?? "")
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
