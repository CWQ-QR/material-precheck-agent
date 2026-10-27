import type { Metadata } from "next";
import Link from "next/link";
import { DeviceRecords } from "@/components/dashboard/device-records";

export const metadata: Metadata = {
  title: "工作台 - 材料一次过",
};

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
              本设备的预审记录与结论一览，最近 50 条。
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
          <DeviceRecords />
        </div>
      </main>
    </div>
  );
}
