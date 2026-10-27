import Link from "next/link";
import type { PrecheckResult } from "@/lib/types";
import { OverallResult } from "./overall-result";
import { IssueCard } from "./issue-card";
import { GenerateNotePanel } from "./generate-note-panel";

export function ReportView({
  documentId,
  result,
}: {
  documentId: string;
  result: PrecheckResult;
}) {
  const issueCount = result.issues.length;

  return (
    <div className="min-h-full bg-slate-50 font-sans">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
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
          <span className="text-xs text-slate-400">
            文档编号：{documentId}
          </span>
        </div>

        {/* 结论 */}
        <div className="mt-8">
          <OverallResult overall={result.overall} />
          <p className="mt-3 text-center text-xs text-slate-400">
            📄 AI 识别到的材料：{result.document_type || "未知文档"}
          </p>
        </div>

        {/* 问题清单 */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              问题清单
            </h2>
            <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600">
              共 {issueCount} 项
            </span>
          </div>

          {issueCount > 0 ? (
            <div className="mt-4 space-y-4">
              {result.issues.map((issue, index) => (
                <IssueCard key={index} issue={issue} index={index} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
              <p className="text-base font-semibold text-emerald-700">
                未发现问题
              </p>
              <p className="mt-1 text-sm text-emerald-600/80">
                材料完整且信息一致，可以放心提交办理。
              </p>
            </div>
          )}
        </section>

        {/* 底部操作：有问题时提供 AI 补正说明生成 */}
        <div className="mt-10 flex flex-col items-center gap-4">
          {issueCount > 0 && <GenerateNotePanel issues={result.issues} />}
          <Link
            href="/upload"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-8 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            再预审一份材料
          </Link>
        </div>
      </div>
    </div>
  );
}
