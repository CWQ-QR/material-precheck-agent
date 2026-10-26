import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 未匹配路由的 404 使用 app/global-not-found.tsx 自定义页面
  experimental: {
    globalNotFound: true,
  },
  // pdf-parse 依赖 pdf.js 与 @napi-rs/canvas 原生模块，
  // 路由中通过 Node 原生方式加载，不打包进 bundle。
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
