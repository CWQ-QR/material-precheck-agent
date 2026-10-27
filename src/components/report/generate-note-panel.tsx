"use client";

import { useEffect, useState } from "react";
import type { PrecheckIssue } from "@/lib/types";

const REQUEST_TIMEOUT_MS = 120_000;

type GenerateState = "idle" | "loading" | "error";

/**
 * “一键生成补正说明”：根据预审问题列表调 AI 生成一段
 * 可直接发给办事窗口的说明文本，弹窗内可编辑、可一键复制。
 */
export function GenerateNotePanel({ issues }: { issues: PrecheckIssue[] }) {
  const [state, setState] = useState<GenerateState>("idle");
  const [note, setNote] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loading = state === "loading";

  // 弹窗打开期间支持 Escape 关闭
  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const handleGenerate = async () => {
    if (loading) return;

    // 已生成过：直接复用上次结果打开弹窗，避免重复消耗调用
    if (note) {
      setModalOpen(true);
      return;
    }

    setErrorMessage(null);
    setState("loading");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        ok: boolean;
        note?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.note) {
        throw new Error(payload.error ?? "补正说明生成失败，请稍后重试");
      }

      setNote(payload.note);
      setCopied(false);
      setState("idle");
      setModalOpen(true);
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "生成失败，请稍后重试";
      const message = /fetch|network|econn|socket|load failed|abort/i.test(
        rawMessage
      )
        ? "网络连接异常，请检查网络后重试"
        : rawMessage;
      setState("error");
      setErrorMessage(message);
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleCopy = async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage("复制失败，请手动选中文本复制");
    }
  };

  return (
    <div className="mt-10 flex flex-col items-center">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
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
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        )}
        {loading ? "AI 正在撰写补正说明..." : "一键生成补正说明"}
      </button>
      <p className="mt-2 text-xs text-slate-400">
        根据以上问题清单，生成一段可发给办事窗口的补正说明
      </p>

      {state === "error" && errorMessage && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {/* 结果弹窗 */}
      {modalOpen && note && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="补正说明"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">补正说明</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="关闭"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              可直接复制发给办事窗口，也可以先在文本框里按实际情况微调。
            </p>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={10}
              className="mt-4 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 shadow-inner transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                {note.length} 字
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 ${
                  copied
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/30"
                }`}
              >
                {copied ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="9" y="9" width="12" height="12" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
                {copied ? "已复制" : "一键复制"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
