"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyDocuments } from "@/lib/user";
import { normalizeReportRow } from "@/lib/report-snapshot";
import type { ReportSnapshot } from "@/lib/types";

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

function RecordsSkeleton() {
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

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700">
      {message}
    </div>
  );
}

/**
 * 工作台记录（设备隔离版）：
 * 先读取 localStorage 里的 my_documents（本设备上传过的 document_id），
 * 再按该 ID 集合查询 Supabase——不查全表，不同设备只能看到自己的历史。
 */
export function DeviceRecords() {
  // null = 加载中；[] = 本设备暂无记录
  const [rows, setRows] = useState<DashboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);
      setRows(null);

      const ids = getMyDocuments();
      // 本设备还没有任何上传记录：直接显示空状态，不打数据库
      if (ids.length === 0) {
        if (!cancelled) setRows([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("documents")
        .select("id,file_name,uploaded_at,reports(id,status,result)")
        .in("id", ids)
        .order("uploaded_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (queryError) {
        setError(`工作台数据加载失败：${queryError.message}`);
        return;
      }
      setRows((data as DashboardRow[] | null) ?? []);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (rows === null) return <RecordsSkeleton />;
  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <RecordRow key={row.id} row={row} />
      ))}
    </div>
  );
}
