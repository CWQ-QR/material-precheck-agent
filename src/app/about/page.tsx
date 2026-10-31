import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "关于我们 - 材料一次过",
};

const TECH_STACK = [
  {
    name: "Next.js 16",
    description: "App Router + Cache Components，服务端渲染与文件约定路由",
  },
  {
    name: "Supabase",
    description: "Postgres 数据库 + 对象存储 + 行级安全（RLS）",
  },
  {
    name: "智谱大模型",
    description: "GLM 系列文本预审 + GLM-4V 视觉 OCR，OpenAI 兼容协议接入",
  },
  {
    name: "Vercel AI SDK",
    description: "generateObject 结构化输出 + Zod Schema 强校验",
  },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-slate-50 font-sans">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[320px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/50 via-violet-200/40 to-sky-200/50 blur-3xl"
      />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        {/* 参赛徽章 */}
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          第九届传智杯参赛作品
        </span>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          关于「材料一次过」
        </h1>

        {/* 项目背景 */}
        <section className="mt-8 space-y-4 text-base leading-8 text-slate-600">
          <p>
            每个人都经历过这样的崩溃时刻：跑了几趟政务大厅，排了半小时队，
            却被告知「材料不齐，回去补」——少盖一个章、日期填错、漏印正反面，
            来回折腾好几趟才能把一件事办成。
          </p>
          <p>
            「材料一次过」想解决这个问题：上传材料 + 填写办事要求，
            AI 在你去窗口之前就完成一次预审——哪些材料缺失、哪些信息互相矛盾、
            哪些格式不符合要求，逐条列出来并给出修改建议，
            把「退件重跑」消灭在家里。
          </p>
        </section>

        {/* 技术栈 */}
        <section className="mt-12">
          <h2 className="text-lg font-bold text-slate-900">技术栈</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {TECH_STACK.map((item) => (
              <div
                key={item.name}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {item.name}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 安全说明 */}
        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">关于材料安全</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            材料文件存储于 Supabase 私有 Storage 桶，数据库启用了行级安全（RLS）；
            AI 预审严格遵循「只基于材料原文作答、不编造」的系统约束，
            无原文依据的结论都会显式标注“原文未提及，请人工核对”。
          </p>
        </section>

        {/* 开发者名片（脱敏版）：仅展示网名 / GitHub ID，不公开真实姓名 */}
        <section className="mt-12 rounded-2xl bg-gray-50 p-6 text-sm text-gray-500 ring-1 ring-inset ring-slate-200/60">
          <p className="font-semibold text-gray-700">开发者：CWQ-QR</p>
          <p className="mt-1.5">
            开源地址：
            <a
              href="https://github.com/CWQ-QR"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline-offset-4 transition-colors hover:text-indigo-700 hover:underline"
            >
              github.com/CWQ-QR
            </a>
          </p>
          <p className="mt-3 leading-6">
            本项目由 CWQ 独立设计与开发，第九届传智杯参赛作品。
          </p>
        </section>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link
            href="/upload"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
          >
            立即体验预审
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            查看工作台
          </Link>
        </div>
      </main>
    </div>
  );
}
