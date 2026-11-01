import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * 不开启 cacheComponents（PPR）：
   * 线上部署到腾讯云 EdgeOne 等边缘运行时时，PPR 的"带洞"流式 RSC 载荷
   * 会被边缘环境提前断流，客户端抛 React #412（"Connection closed."）。
   * 关闭后所有路由使用标准 SSR 流式响应，兼容性最好。
   */
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
