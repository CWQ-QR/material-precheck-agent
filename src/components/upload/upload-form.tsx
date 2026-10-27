"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ACCEPTED_FILE_TYPES,
  assertAcceptedFile,
  registerDocument,
  uploadMaterial,
} from "@/lib/materials";
import { createPendingReport } from "@/lib/reports";

type UploadStatus = "idle" | "uploading" | "saving" | "analyzing" | "error";

const STATUS_TEXT: Record<UploadStatus, string> = {
  idle: "上传并分析",
  uploading: "正在上传文件…",
  saving: "上传成功，正在创建预审任务…",
  analyzing: "AI 正在深度比对材料与要求...",
  error: "上传并分析",
};

const REQUIREMENTS_PLACEHOLDER =
  "例如：需要身份证、申请表，日期必须在2026年以后";

/** 快捷场景 Tag：点击自动填入预设的办事要求文本 */
const REQUIREMENT_PRESETS = [
  {
    label: "居住证办理",
    text: "1. 身份证原件及正反面复印件；2. 居住登记回执；3. 近期一寸免冠照片 2 张；4. 房屋租赁合同或房产证复印件。所有材料须在有效期内。",
  },
  {
    label: "人才落户",
    text: "1. 身份证及户口簿首页、本人页复印件；2. 学历学位证书；3. 劳动合同及社保缴纳证明；4. 近期免冠照片。证件须在有效期内，日期须为 2026 年（含）以后。",
  },
  {
    label: "学历认证",
    text: "1. 身份证正反面扫描件；2. 毕业证书原件扫描件；3. 学位证书（如有）；4. 学信网学历备案表。扫描件须清晰完整，关键信息无遮挡。",
  },
];

/**
 * 预审接口客户端等待上限。
 * 超时后不再阻塞页面：服务端会继续跑完并把 reports 置为 done/failed，
 * 报告页轮询会拿到最终状态。
 */
const PRECHECK_REQUEST_TIMEOUT_MS = 120_000;

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [requirements, setRequirements] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProcessing =
    status === "uploading" || status === "saving" || status === "analyzing";
  const trimmedRequirements = requirements.trim();
  const canSubmit =
    !!file && trimmedRequirements.length > 0 && !isProcessing;

  const resetFileInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    // 处理中禁止更换文件，避免竞态
    if (isProcessing) {
      event.preventDefault();
      return;
    }

    const selected = event.target.files?.[0] ?? null;
    setErrorMessage(null);

    if (!selected) {
      setFile(null);
      return;
    }

    try {
      assertAcceptedFile(selected);
      setFile(selected);
    } catch (error) {
      setFile(null);
      setErrorMessage(error instanceof Error ? error.message : "文件不合规");
      resetFileInput();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // 防重复点击 / 缺文件或缺要求时拦截
    if (!canSubmit) return;

    setErrorMessage(null);

    let documentId: string | null = null;

    try {
      // 第一步：上传文件到 Storage 的 materials 桶
      setStatus("uploading");
      const filePath = await uploadMaterial(file as File);

      // 第二步：documents 表登记，同时创建 pending 的 reports 记录
      setStatus("saving");
      documentId = await registerDocument({
        fileName: (file as File).name,
        filePath,
      });
      await createPendingReport(documentId);

      // 第三步：调用后端预审接口（同步等待 AI 分析）。
      // 加客户端超时，超时/网络异常不再留在本页报错——此时 pending 报告已建、
      // 服务端会继续执行并回写状态，统一跳转报告页由轮询接管。
      setStatus("analyzing");
      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        PRECHECK_REQUEST_TIMEOUT_MS
      );
      try {
        const response = await fetch("/api/precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: documentId,
            requirements: trimmedRequirements,
          }),
          signal: controller.signal,
        });

        // 业务失败（如材料无法解析、AI 调用失败）时接口已把报告置为 failed，
        // 仍跳转到报告页展示具体失败原因。
        if (!response.ok) {
          console.warn("预审接口返回失败:", await response.text());
        }
      } catch (error) {
        console.warn(
          "预审请求未正常完成（超时或网络异常），将跳转报告页继续等待:",
          error instanceof Error ? error.message : error
        );
      } finally {
        window.clearTimeout(timeoutId);
      }

      // 第四步：跳转到报告页（pending 时页面会自动轮询）
      router.push(`/report/${documentId}`);
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "处理失败，请稍后重试";
      // 断网等网络层故障给出可理解的提示，避免暴露底层报错
      const message = /fetch|network|econn|socket|load failed/i.test(rawMessage)
        ? "网络连接异常，请检查网络后重试"
        : rawMessage;
      setStatus("error");
      setErrorMessage(message);
    }
  };

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-50 px-6 py-16 font-sans">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/50 via-violet-200/40 to-sky-200/50 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
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

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            上传办事材料
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            支持 PDF、图片（JPG/PNG/WEBP/BMP，图片不超过 5MB）或文本文件（TXT/MD/CSV/JSON/LOG，不超过 10MB），上传后将自动进行预审分析。
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            {/* 办事要求 */}
            <div>
              <label
                htmlFor="requirements"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                办事要求
              </label>
              <div className="mb-2.5 flex flex-wrap gap-2">
                {REQUIREMENT_PRESETS.map((preset) => {
                  const active = trimmedRequirements === preset.text;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setRequirements(preset.text);
                        setErrorMessage(null);
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                        active
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                id="requirements"
                name="requirements"
                rows={3}
                required
                disabled={isProcessing}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder={REQUIREMENTS_PLACEHOLDER}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
              />
            </div>

            {/* 文件选择 */}
            <input
              ref={inputRef}
              type="file"
              name="material"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              disabled={isProcessing}
              className="sr-only"
              id="material-file-input"
            />
            <label
              htmlFor="material-file-input"
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                isProcessing
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/40"
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              {file ? (
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {file.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {formatFileSize(file.size)} · 点击可重新选择
                  </span>
                </span>
              ) : (
                <span>
                  <span className="block text-sm font-semibold text-slate-700">
                    点击选择文件
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    支持 PDF、图片或文本文件，最大 10MB（图片 5MB）
                  </span>
                </span>
              )}
            </label>

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
            >
              {isProcessing && (
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
              )}
              {STATUS_TEXT[status]}
            </button>

            {isProcessing && (
              <p className="mt-3 text-center text-xs text-slate-500">
                {status === "analyzing"
                  ? "AI 分析通常需要数秒到数十秒，请勿关闭页面或重复点击…"
                  : "请勿关闭页面或重复点击按钮…"}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
