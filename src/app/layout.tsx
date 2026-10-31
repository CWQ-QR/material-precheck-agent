import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "材料一次过 - 办事材料预审 Agent",
  description: "上传材料，提前发现缺漏与矛盾，让办事不再来回跑。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Navbar 使用 usePathname，cacheComponents 预渲染时需在 Suspense 内 */}
        <Suspense
          fallback={
            <div className="h-16 animate-pulse border-b border-slate-200 bg-white/80 backdrop-blur" />
          }
        >
          <Navbar />
        </Suspense>
        {/* flex-1 让内容区撑满剩余高度，页脚始终贴在页面最底部 */}
        <div className="flex flex-1 flex-col">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
