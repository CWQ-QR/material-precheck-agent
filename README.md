This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写。**含 `AI_` 前缀与 `SUPABASE_SERVICE_ROLE_KEY` 的变量均为服务端专用，切勿添加 `NEXT_PUBLIC_` 前缀或暴露到客户端。**

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址（公开） | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 key（公开，受 RLS 约束） | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（仅服务端） | — |
| `AI_API_KEY` | 智谱开放平台 API Key | — |
| `AI_BASE_URL` | 智谱 OpenAI 兼容接口地址 | `https://open.bigmodel.cn/api/paas/v4` |
| `AI_MODEL` | 预审文本模型 | `glm-4-flash` |
| `AI_VISION_MODEL` | 图片 OCR 视觉模型（图片材料先经它提取文字再预审） | `glm-4v-flash` |

## Deploy on Vercel

1. 导入仓库后，在 **Project Settings → Environment Variables** 中逐项添加上表中的全部变量（Production / Preview / Development 至少勾选实际使用的环境）。
2. 修改环境变量后需要 **Redeploy** 才会生效。

## Deploy on EdgeOne（腾讯云边缘一站式部署）

1. 在 EdgeOne Pages 控制台创建项目并绑定仓库，构建预设选择 Next.js。
2. 在 **项目设置 → 环境变量** 中添加上表中的全部变量；`AI_*` 与 `SUPABASE_SERVICE_ROLE_KEY` 标记为"敏感"避免注入到前端构建产物。
3. 变量更新后需重新触发构建部署。

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
