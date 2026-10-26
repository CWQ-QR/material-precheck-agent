// 全局 404 页：URL 未匹配任何路由时渲染。
// 该文件绕过根 layout，必须返回完整 HTML 文档并自行引入全局样式。
import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "页面不存在 - 材料一次过",
};

export default function GlobalNotFound() {
  return (
    <html lang="zh-CN">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 font-sans">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/60">
            <p className="text-6xl font-bold tracking-tight text-slate-200">
              404
            </p>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
              页面不存在或已被移动
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              您访问的地址可能有误，材料数据不会丢失。
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
            >
              返回首页
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
