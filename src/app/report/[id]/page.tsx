import { Suspense } from "react";
import type { Metadata } from "next";
import { ReportEntry } from "@/components/report/report-entry";
import { DownloadPdfButton } from "@/components/report/download-pdf-button";
import { getReportSnapshotServer } from "@/lib/reports-server";

export const metadata: Metadata = {
  title: "预审报告 - 材料一次过",
};

function ReportSkeleton() {
  return (
    <div className="min-h-full animate-pulse bg-slate-50 font-sans">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="mt-8 h-48 rounded-3xl bg-slate-200" />
        <div className="mt-10 h-5 w-28 rounded bg-slate-200" />
        <div className="mt-4 space-y-4">
          <div className="h-36 rounded-2xl bg-slate-200" />
          <div className="h-36 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

/**
 * 预审报告页。
 * Next.js 16 中动态路由 params / searchParams 均为 Promise；DB 查询等运行时访问放在 Suspense 内。
 * 服务端先用 service role 取一次初始快照（避免首屏闪烁），
 * 再由 ReportEntry 决定：流式渐进渲染（streaming=true 且本地有办事要求）
 * 或 2 秒轮询从 Supabase 读取。
 */
async function ReportContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ streaming?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const initial = await getReportSnapshotServer(id);

  return (
    // 核心内容区域：PDF 导出时以此元素为截图范围（不含全局导航栏）
    <div id="report-content" className="relative min-h-full">
      <ReportEntry
        documentId={id}
        initial={initial}
        wantsStreaming={query.streaming === "true"}
      />
      <DownloadPdfButton />
    </div>
  );
}

export default function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ streaming?: string }>;
}) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
