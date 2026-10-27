"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/dashboard", label: "工作台" },
  { href: "/about", label: "关于" },
];

function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * 全局导航栏：吸顶 + 毛玻璃，滚动后加深边框与阴影；
 * 当前路由高亮，右侧常驻"开始预审"入口。
 */
export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl transition-all ${
        scrolled
          ? "border-slate-200 shadow-sm shadow-slate-200/50"
          : "border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm text-white shadow-md shadow-indigo-600/25">
            过
          </span>
          <span className="text-lg">材料一次过</span>
        </Link>

        {/* 导航链接 */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <Link
          href="/upload"
          className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-all hover:shadow-lg hover:shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 sm:inline-flex"
        >
          开始预审
        </Link>
      </nav>
    </header>
  );
}
