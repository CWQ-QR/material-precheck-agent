import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 项目没有 postcss.config，Tailwind v4 的 CSS 由 Turbopack loader 处理；
  // 去掉这段会导致 @theme / @import "tailwindcss" 不被解析。
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
