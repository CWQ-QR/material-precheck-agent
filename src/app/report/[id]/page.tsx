import { Suspense } from "react";
import type { Metadata } from "next";
import { ReportPoller } from "@/components/report/report-poller";
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
 * Next.js 16 中动态路由 params 为 Promise；DB 查询等运行时访问放在 Suspense 内。
 * 服务端先用 service role 取一次初始快照（避免首屏闪烁），
 * pending 时交给 ReportPoller 在浏览器端每 2 秒轮询。
 */
async function ReportContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initial = await getReportSnapshotServer(id);

  return <ReportPoller documentId={id} initial={initial} />;
}

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportContent params={params} />
    </Suspense>
  );
}
