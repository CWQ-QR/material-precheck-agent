import type { ReactNode } from "react";
import Link from "next/link";

function ReportShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-slate-50 font-sans">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          返回首页
        </Link>
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      </div>
    </div>
  );
}

/** status === 'pending'：AI 分析进行中 */
export function PendingReport() {
  return (
    <ReportShell>
      <span className="relative flex h-16 w-16">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-300 opacity-60" />
        <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
          <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
      </span>
      <h2 className="mt-8 text-2xl font-bold tracking-tight text-slate-900">
        AI 正在深度比对材料与要求，请稍候...
      </h2>
      <p className="mt-3 max-w-sm animate-pulse text-sm leading-6 text-slate-500">
        正在逐项排查材料缺漏、信息矛盾与格式问题，通常需要数秒到数十秒，本页面会自动刷新结果。
      </p>
    </ReportShell>
  );
}

/**
 * 将底层错误映射为用户可理解的提示。
 * AI 服务断网/限流/超时等场景统一展示"AI 预审服务繁忙，请稍后重试"，
 * 其余业务错误（如文件无法解析）保留原始信息。
 */
const BUSY_ERROR_PATTERN =
  /繁忙|限流|rate|429|503|timeout|timed?\s*out|超时|econn|enet|socket\s*hang|fetch\s*failed|network|aborted|aborterror| overloaded/i;

function friendlyErrorMessage(message: string): string {
  return BUSY_ERROR_PATTERN.test(message)
    ? "AI 预审服务繁忙，请稍后重试"
    : message;
}

/** status === 'failed'：预审失败 */
export function FailedReport({ errorMessage }: { errorMessage: string | null }) {
  const message = errorMessage
    ? friendlyErrorMessage(errorMessage)
    : "预审过程中发生未知错误，请稍后重试。";

  return (
    <ReportShell>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <h2 className="mt-8 text-2xl font-bold tracking-tight text-red-600">
        预审失败
      </h2>
      <p className="mt-3 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
        {message}
      </p>
      <Link
        href="/upload"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30"
      >
        重新上传材料
      </Link>
    </ReportShell>
  );
}

/** reports 表中查不到对应记录 */
export function MissingReport() {
  return (
    <ReportShell>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-500">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </span>
      <h2 className="mt-8 text-2xl font-bold tracking-tight text-slate-900">
        未找到预审记录
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
        该材料可能尚未发起预审，或记录已失效。
      </p>
      <Link
        href="/upload"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30"
      >
        去上传材料
      </Link>
    </ReportShell>
  );
}
