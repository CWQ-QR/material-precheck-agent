"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parsePartialJson } from "ai";
import {
  precheckPartialResultSchema,
  precheckResultSchema,
  type IssueType,
  type OverallStatus,
  type PrecheckPartialIssue,
  type PrecheckPartialResult,
  type PrecheckResult,
} from "@/lib/precheck-schema";
import type { ReportSnapshot } from "@/lib/types";
import { ReportPoller } from "./report-poller";
import { ReportView } from "./report-view";

type Phase = "streaming" | "error" | "done";

/** 问题类型的本地展示元信息（与 IssueCard 视觉保持一致） */
const ISSUE_TYPE_LABEL: Record<IssueType, { label: string; badgeClass: string }> =
  {
    missing: {
      label: "缺失",
      badgeClass: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
    },
    mismatch: {
      label: "矛盾",
      badgeClass:
        "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    },
    format: {
      label: "格式不符",
      badgeClass: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    },
    ambiguous: {
      label: "表述歧义",
      badgeClass:
        "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20",
    },
  };

const OVERALL_LABEL: Record<OverallStatus, string> = {
  pass: "通过",
  conditional: "条件通过",
  reject: "不通过",
};

/** 骨架占位条 */
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded bg-slate-200/80 ${className}`}
    />
  );
}

/** 单条「正在生成」的问题卡片：字段到齐多少渲染多少，其余用骨架屏 */
function StreamingIssueCard({
  issue,
  index,
}: {
  issue: PrecheckPartialIssue;
  index: number;
}) {
  const meta = issue.type ? ISSUE_TYPE_LABEL[issue.type] : null;

  return (
    <article className="animate-card-enter rounded-2xl border border-slate-200 border-l-4 border-l-slate-300 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold leading-7 text-slate-900">
          <span className="mr-2 text-slate-400">
            {String(index + 1).padStart(2, "0")}
          </span>
          {issue.description ?? (
            <span className="inline-flex flex-col gap-2 align-middle">
              <Shimmer className="h-4 w-72 max-w-full" />
              <Shimmer className="h-4 w-52 max-w-full" />
            </span>
          )}
        </h3>
        {meta ? (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}
          >
            {meta.label}
          </span>
        ) : (
          <span className="shrink-0 animate-pulse rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-400">
            分析中…
          </span>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-600">
        <svg
          className="mt-1 h-4 w-4 shrink-0 text-indigo-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
            clipRule="evenodd"
          />
        </svg>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-slate-700">修改建议：</span>
          {issue.suggestion ?? (
            <span className="inline-flex flex-col gap-1.5 align-middle">
              <Shimmer className="h-3.5 w-full max-w-md" />
              <Shimmer className="h-3.5 w-2/3" />
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        {issue.source_quote === undefined ? (
          <Shimmer className="h-14 w-full rounded-xl" />
        ) : issue.source_quote ? (
          <figure className="rounded-xl border-l-4 border-slate-300 bg-slate-50 px-4 py-3">
            <figcaption className="text-xs font-medium text-slate-500">
              原文依据
            </figcaption>
            <blockquote className="mt-1 text-sm leading-6 text-slate-600">
              {issue.source_quote}
            </blockquote>
          </figure>
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-600">
            <span aria-hidden>⚠️</span>
            原文未提及，请人工核对
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * 流式报告视图：
 * - 发起 /api/precheck 请求并逐块读取 text 流（内容为 AI 输出的 JSON 文本增量）；
 * - 每收到一块就做「部分 JSON 解析 + 部分校验」，把已到齐的字段渐进渲染出来，
 *   未到齐的字段用骨架屏占位，形成打字机效果；
 * - 成功结束后切换为正式的 ReportView（与刷新后从 Supabase 读到的完全一致）；
 * - 出错时回退到 ReportPoller（服务端已把终态落库，轮询能拿到结果）。
 *
 * 注意：fetch 故意不在卸载时 abort——即使用户离开页面，也让服务端把结果
 * 写完，保证历史记录可查。
 */
export function StreamingReport({
  documentId,
  requirements,
  initial,
}: {
  documentId: string;
  requirements: string;
  initial: ReportSnapshot | null;
}) {
  const [phase, setPhase] = useState<Phase>("streaming");
  const [partial, setPartial] = useState<PrecheckPartialResult>({});
  const [charCount, setCharCount] = useState(0);
  const [finalResult, setFinalResult] = useState<PrecheckResult | null>(null);
  // StrictMode 下 effect 会双跑，用 ref 保证流只发起一次
  const startedRef = useRef(false);

  useEffect(() => {
    // 发起流式请求的同时清掉 URL 上的 streaming 标记：
    // 中途刷新/分享链接时走轮询回退，而不是重复发起 AI 请求
    const url = new URL(window.location.href);
    if (url.searchParams.has("streaming")) {
      url.searchParams.delete("streaming");
      window.history.replaceState(window.history.state, "", url);
    }

    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        const response = await fetch("/api/precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: documentId, requirements }),
        });

        if (!response.ok || !response.body) {
          // 4xx/5xx：材料提取等前置失败，服务端已落库 failed，交给轮询展示
          throw new Error(
            `预审接口返回 ${response.status}，正在从服务端获取结果…`
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setCharCount(acc.length);

          // 部分 JSON 解析（自动修复未闭合的 JSON），再校验保留合法字段
          const { value: partialValue } = await parsePartialJson(acc);
          if (partialValue !== undefined) {
            const parsedPartial =
              precheckPartialResultSchema.safeParse(partialValue);
            if (parsedPartial.success) {
              setPartial(parsedPartial.data);
            }
          }
        }
        acc += decoder.decode();

        // 流结束：完整 JSON 必须通过 Zod 校验才进入正式视图
        const final = precheckResultSchema.safeParse(JSON.parse(acc));
        if (!final.success) {
          throw new Error("AI 输出未通过格式校验");
        }
        setFinalResult(final.data);
        setPhase("done");
      } catch (error) {
        console.warn(
          "[report] 流式渲染中断，回退为轮询:",
          error instanceof Error ? error.message : error
        );
        setPhase("error");
      }
    };

    void run();
  }, [documentId, requirements]);

  if (phase === "done" && finalResult) {
    // 与「刷新后从 Supabase 渲染」完全相同的正式报告视图
    return <ReportView documentId={documentId} result={finalResult} />;
  }

  if (phase === "error") {
    // 服务端 onFinish/onError/after 已把终态写入数据库，轮询一定能拿到
    return <ReportPoller documentId={documentId} initial={initial} />;
  }

  // ---- 流式进行中：AI 思考横幅 + 渐进问题卡片 ----
  const issues = partial.issues ?? [];
  const overallText =
    partial.overall !== undefined ? OVERALL_LABEL[partial.overall] : null;
  // 阶段一：已收到流式数据，但还没解析出 overall → 呼吸灯「阅读比对」提示
  const readingRules = charCount > 0 && partial.overall === undefined;

  return (
    <div className="min-h-full bg-slate-50 font-sans">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            返回首页
          </Link>
          <span className="text-xs text-slate-400">文档编号：{documentId}</span>
        </div>

        {/* AI 思考横幅 */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-sky-50 shadow-sm">
          <div className="flex items-center justify-between gap-4 px-8 pt-7">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-50" />
                <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30">
                  <svg
                    className="h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
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
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  AI 正在思考
                </h1>
                <p
                  className={`mt-0.5 text-sm text-slate-500 ${
                    readingRules ? "animate-pulse" : ""
                  }`}
                >
                  {charCount === 0
                    ? "正在连接 AI 分析服务…"
                    : readingRules
                      ? "🔍 AI 正在阅读材料并比对规则..."
                      : partial.issues === undefined
                        ? "已完成初步判断，正在逐项排查问题…"
                        : `已排查出 ${issues.length} 项问题，正在核对原文依据与建议…`}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 font-mono text-xs text-slate-500 shadow-sm">
              已生成 {charCount} 字
            </span>
          </div>

          {/* 里程碑清单：随流式进度逐个点亮 */}
          <ol className="flex flex-wrap items-center gap-x-6 gap-y-2 px-8 pb-7 pt-5 text-sm">
            {[
              { label: "通读办事要求", done: charCount > 0 },
              { label: "比对材料内容", done: partial.overall !== undefined },
              { label: "排查材料问题", done: partial.issues !== undefined },
              {
                label: "汇总预审结论",
                done: phase !== "streaming",
                active: true,
              },
            ].map((step, index) => (
              <li
                key={step.label}
                className="flex items-center gap-1.5 text-slate-500"
              >
                {step.done ? (
                  <svg
                    className="h-4 w-4 text-emerald-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-400">
                    {index + 1}
                  </span>
                )}
                <span
                  className={
                    step.done ? "font-medium text-slate-700" : undefined
                  }
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* 阶段性状态提示：已识别材料 / 初步结论（随流式数据到达逐个浮现） */}
        {(partial.document_type || overallText) && (
          <div className="animate-card-enter mt-6 flex flex-wrap items-center gap-3">
            {partial.document_type && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 shadow-sm">
                📄 已识别材料：
                <span className="font-semibold text-slate-900">
                  {partial.document_type}
                </span>
              </div>
            )}
            {overallText && (
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-1.5 text-sm text-slate-600 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                初步结论：
                <span className="font-semibold text-slate-900">
                  {overallText}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 渐进问题清单 */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">问题清单</h2>
            <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600">
              {issues.length > 0 ? `已发现 ${issues.length} 项` : "检查中"}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {issues.map((issue, index) => (
              <StreamingIssueCard
                key={index}
                issue={issue}
                index={index}
              />
            ))}
            {issues.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
                <span className="inline-flex flex-col items-center gap-3">
                  <Shimmer className="h-4 w-64" />
                  <Shimmer className="h-4 w-48" />
                  <span className="text-xs text-slate-400">
                    正在逐项检查材料缺漏、信息矛盾与格式问题…
                  </span>
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
