"use client";

// 全局错误兜底：任何页面渲染/数据获取抛错时显示友好卡片，避免白屏。
// 注意：本版本 Next.js 的 error.tsx props 为 { error, retry }。

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary] 页面发生未处理错误:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/60">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg
            className="h-8 w-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <h1 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
          系统开小差了，请刷新重试
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          页面出现了意外问题，您的材料数据不会丢失。
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
          >
            重试
          </button>
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
