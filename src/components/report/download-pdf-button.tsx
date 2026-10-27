"use client";

import { useRef, useState } from "react";

/** PDF 文件名：预审报告_时间戳.pdf */
function buildPdfFilename(): string {
  return `预审报告_${new Date().getTime()}.pdf`;
}

/** A4 页面尺寸（mm）与页边距（mm） */
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 10;

/**
 * 「下载预审报告」浮动按钮（右下角悬浮）。
 *
 * - 手动组合 html2canvas-pro + jsPDF 生成 PDF：
 *   html2pdf.js 内置打包的 html2canvas 1.4.1 不支持 Tailwind v4 的
 *   oklch/lab 现代颜色函数（报 "unsupported color function lab"），
 *   html2canvas-pro 是支持现代色彩规范的社区分支；
 * - html2canvas-pro 依赖 window，因此在点击时动态 import（SSR 安全）；
 * - 生成期间按钮保持渲染（显示“正在生成...”并禁用），通过 html2canvas 的
 *   ignoreElements 把它排除在截图之外——既不印进 PDF，
 *   也避免“截图进行中 React 移除按钮 DOM”引发的渲染竞态；
 * - 下载用标准 Blob + 锚点方式，行为完全可控。
 */
export function DownloadPdfButton() {
  const [generating, setGenerating] = useState(false);
  // ref 防重入：状态更新是异步的，连续快速点击时 state 守卫可能漏拦
  const runningRef = useRef(false);

  const handleDownload = async () => {
    if (runningRef.current) return;

    const target = document.getElementById("report-content");
    if (!target) return;

    runningRef.current = true;
    setGenerating(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      // 渲染为高清位图（scale=2 提升文字清晰度）
      const canvas = await html2canvas(target, {
        useCORS: true,
        scale: 2,
        // 把带 pdf-exclude 标记的元素（本按钮）从截图中排除
        ignoreElements: (element: Element) =>
          element.classList.contains("pdf-exclude"),
      });

      // 按 A4 + 页边距排版；同一张位图按页偏移绘制实现多页
      const pdf = new jsPDF("p", "mm", "a4");
      const innerWidthMm = PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2;
      const innerHeightMm = PAGE_HEIGHT_MM - PAGE_MARGIN_MM * 2;
      const imgHeightMm = (canvas.height * innerWidthMm) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      pdf.addImage(
        imgData,
        "PNG",
        PAGE_MARGIN_MM,
        PAGE_MARGIN_MM,
        innerWidthMm,
        imgHeightMm
      );
      let restHeightMm = imgHeightMm - innerHeightMm;
      while (restHeightMm > 0) {
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          PAGE_MARGIN_MM,
          PAGE_MARGIN_MM - (imgHeightMm - restHeightMm),
          innerWidthMm,
          imgHeightMm
        );
        restHeightMm -= innerHeightMm;
      }

      // 标准 Blob 下载：锚点 + download 属性，绝不引起页面跳转
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildPdfFilename();
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // 延迟释放，确保浏览器已开始读取 blob 数据
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      console.error("[report] PDF 生成失败:", error);
      alert("PDF 生成失败，请重试");
    } finally {
      runningRef.current = false;
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      aria-busy={generating}
      className={`pdf-exclude fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-4 focus:ring-indigo-200 ${
        generating
          ? "animate-pulse cursor-not-allowed bg-indigo-400 shadow-indigo-400/30"
          : "bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-700 hover:shadow-indigo-600/40"
      }`}
    >
      {generating ? "正在生成..." : "📥 下载预审报告"}
    </button>
  );
}
