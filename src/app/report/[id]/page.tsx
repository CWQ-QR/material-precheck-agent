import { Suspense } from "react";
import type { Metadata } from "next";
import { ReportView } from "@/components/report/report-view";
import { getMockPrecheckResult } from "@/lib/mock-report";

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
 * 运行时数据访问（params / 未来的 AI 结果拉取）放在 Suspense 边界内，
 * 符合 Next.js 16 Cache Components 的流式渲染约定。
 */
async function ReportContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = getMockPrecheckResult();

  return <ReportView documentId={id} result={result} />;
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
