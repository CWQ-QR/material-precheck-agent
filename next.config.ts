import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 排除服务端的原生模块，防止打包报错（解决云端 DOMMatrix 问题的关键）
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  
  // 下面这段是你原本的 Tailwind v4 配置，保留不动
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