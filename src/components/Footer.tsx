/**
 * 全局页脚：仅展示网名（GitHub ID），不公开真实姓名。
 * 布局上由 layout.tsx 的 flex flex-col 容器 + children 的 flex-1
 * 保证页脚始终位于页面最底部。
 */
export function Footer() {
  return (
    <footer className="flex flex-col items-center gap-2 px-4 py-8 text-center text-xs text-gray-400">
      <p>© 2026 材料一次过 · 第九届传智杯参赛作品</p>
      <p>Designed &amp; Built by CWQ-QR · Powered by Next.js &amp; Zhipu AI</p>
    </footer>
  );
}
