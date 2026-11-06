import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * 不开启 cacheComponents（PPR）：
   * 线上部署到腾讯云 EdgeOne 等边缘运行时时，PPR 的"带洞"流式 RSC 载荷
   * 会被边缘环境提前断流，客户端抛 React #412（"Connection closed."）。
   * 关闭后所有路由使用标准 SSR 流式响应，兼容性最好。
   */
  // PDF 解析用 unpdf：自带无服务器适配的 PDF.js 构建，无原生依赖，
  // 无需再从外部包加载（原 pdf-parse 在 EdgeOne 上报 DOMMatrix 未定义）。
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
