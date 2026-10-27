"use client";

import { useEffect, useState } from "react";

/** Agent 工作流的四个步骤（按顺序点亮） */
const WORKFLOW_STEPS = [
  "正在解析文件与提取多模态文本...",
  "正在比对办事要求与规则约束...",
  "正在执行 AI 深度研判...",
  "正在生成结构化预审报告...",
] as const;

/** 每个步骤的停留时长（毫秒） */
const STEP_DURATION_MS = 4000;

/**
 * AI Agent 工作流状态面板（页面中央）。
 *
 * - 用 useState + setTimeout 模拟多步工作流：步骤随时间逐个亮起，
 *   已完成步骤打勾、当前步骤转圈、未来步骤置灰；
 * - 最后一步保持"执行中"（不再排定时器），直到真实结果到达后
 *   由调用方整体切换视图、本组件卸载；
 * - 每个定时器都在 effect cleanup 中清理，组件卸载绝不残留。
 */
export function AgentWorkflowPanel() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= WORKFLOW_STEPS.length - 1) return;
    const timer = window.setTimeout(
      () => setStep((current) => current + 1),
      STEP_DURATION_MS
    );
    return () => window.clearTimeout(timer);
  }, [step]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* 呼吸灯光晕：随面板呼吸的柔和渐变底光 */}
      <div
        aria-hidden
        className="absolute -inset-1 animate-pulse rounded-[28px] bg-gradient-to-r from-indigo-200/60 via-violet-200/50 to-sky-200/60 blur-xl"
      />

      <div className="relative rounded-3xl border border-indigo-100 bg-white/90 px-8 py-8 shadow-xl shadow-indigo-100/60 backdrop-blur">
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
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              AI Agent 工作流
            </h2>
            <p className="text-xs text-slate-400">
              自动执行中，每一步实时推进
            </p>
          </div>
        </div>

        <ol className="mt-7 space-y-5">
          {WORKFLOW_STEPS.map((label, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <li
                key={label}
                className={`flex items-center gap-3 transition-opacity duration-700 ${
                  done || active ? "opacity-100" : "opacity-40"
                }`}
              >
                {done ? (
                  <svg
                    className="h-6 w-6 shrink-0 text-emerald-500"
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
                ) : active ? (
                  <svg
                    className="h-6 w-6 shrink-0 animate-spin text-indigo-600"
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
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xs text-slate-400">
                    {index + 1}
                  </span>
                )}
                <span
                  className={`text-sm transition-colors duration-700 ${
                    done
                      ? "text-slate-500"
                      : active
                        ? "font-semibold text-slate-900"
                        : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
