import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeReportRow } from "@/lib/report-snapshot";
import type { ReportSnapshot } from "@/lib/types";

export const metadata: Metadata = {
  title: "工作台 - 材料一次过",
};

interface EmbeddedReport {
  id: string | null;
  status: string;
  result: unknown;
}

interface DashboardRow {
  id: string;
  file_name: string;
  uploaded_at: string;
  reports: EmbeddedReport[] | null;
}

/**
 * 显示用的时间格式化：统一按北京时间渲染，
 * 避免部署在海外节点（如 Vercel UTC）时时间差 8 小时。
 */
function formatBeijingTime(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  if (Number.isNaN(shifted.getTime())) return "未知时间";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ` +
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  );
}

/** 预审结论徽章：pending / failed / done(pass|conditional|reject) */
function StatusBadge({ snapshot }: { snapshot: ReportSnapshot | null }) {
  if (!snapshot) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
        未预审
      </span>
    );
  }
  if (snapshot.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
        AI 预审中
      </span>
    );
  }
  if (snapshot.status === "failed") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
        预审失败
      </span>
    );
  }

  const overall = snapshot.result?.overall;
  if (!overall) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
        预审失败
      </span>
    );
  }

  const styles = {
    pass: "bg-emerald-50 text-emerald-700",
    conditional: "bg-amber-50 text-amber-700",
    reject: "bg-red-50 text-red-700",
  } as const;
  const labels = {
    pass: "✓ 预审通过",
    conditional: "需补正",
    reject: "不通过",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[overall]}`}
    >
      {labels[overall]}
    </span>
  );
}

function RecordRow({ row }: { row: DashboardRow }) {
  const embedded = row.reports?.[0] ?? null;
  const snapshot = embedded
    ? normalizeReportRow({
        id: embedded.id ?? row.id,
        document_id: row.id,
        status: embedded.status as "pending" | "done" | "failed",
        result: embedded.result,
      })
    : null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {row.file_name}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          上传于 {formatBeijingTime(row.uploaded_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge snapshot={snapshot} />
        <Link
          href={`/report/${row.id}`}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        >
          查看详情
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/** 空状态：插画 + 引导上传 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
      <svg
        className="h-28 w-28 text-slate-300"
        viewBox="0 0 120 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="26" y="14" width="52" height="66" rx="8" className="fill-white" />
        <path d="M38 34h28M38 46h28M38 58h16" />
        <circle cx="80" cy="78" r="18" className="fill-sky-50" />
        <path d="m93 91 12 12" strokeWidth="5" />
        <path
          d="m73 78 5 5 10-10"
          className="stroke-emerald-400"
          strokeWidth="4"
        />
      </svg>
      <h2 className="mt-6 text-lg font-bold text-slate-900">暂无预审记录</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
        上传办事材料并填写要求，AI 会帮你提前发现缺漏与矛盾。
      </p>
      <Link
        href="/upload"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
      >
        去上传一份试试
      </Link>
    </div>
  );
}

/** 动态数据：联表查询最近 50 条上传记录及其预审结论 */
async function DashboardRecords() {
  const { data, error } = await supabase
    .from("documents")
    .select("id,file_name,uploaded_at,reports(id,status,result)")
    .order("uploaded_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`工作台数据加载失败：${error.message}`);
  }

  const rows = (data as DashboardRow[] | null) ?? [];
  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <RecordRow key={row.id} row={row} />
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[88px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60"
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-slate-50 font-sans">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[300px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/40 via-violet-200/30 to-sky-200/40 blur-3xl"
      />
      <main className="relative z-10 mx-auto w-full max-w-4xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              工作台
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              全部预审记录与结论一览，最近 50 条。
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-all hover:shadow-lg hover:shadow-indigo-600/30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            上传新材料
          </Link>
        </div>

        <div className="mt-8">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardRecords />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
