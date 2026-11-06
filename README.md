# 材料一次过 - 基于多模态大模型的办事材料预审 Agent

> 第九届传智杯全国大学生 IT 技能大赛 参赛作品
> 在线体验地址：[https://wqc-precheck.icu](https://wqc-precheck.icu)

## 📖 项目简介

“材料一次过”是一款 AI Native 的办事材料预审 Web 应用。针对群众办事时因材料缺漏、信息矛盾而反复跑腿的痛点，本项目将大语言模型（LLM）与 Agent 工作流深度结合。用户只需输入办事要求并上传材料（支持 PDF/图片/文本），系统即可模拟严苛的“窗口审核员”，提前发现材料问题，并支持一键生成补正说明与导出 PDF 报告。

## ✨ 核心特性

- **多模态解析**：集成智谱 GLM-4V 视觉模型与 unpdf，支持纸质拍照与电子版 PDF 提取。
- **三位一体防幻觉机制**：硬代码拦截 + Zod Schema 强制溯源 + System Prompt 类型预判，彻底杜绝 AI 瞎编。
- **Agent 思考可视化**：前端四步工作流动态展示，结合 Vercel AI SDK 流式输出（打字机效果）。
- **数据隔离与安全**：基于 Supabase RLS 与前端 LocalStorage 实现轻量级设备数据隔离。
- **效率工具闭环**：一键生成补正说明话术，一键导出高保真 PDF 报告。

## 🛠️ 技术架构

- **前端框架**：Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **数据与存储**：Supabase (PostgreSQL + Storage)
- **AI 引擎**：智谱大模型 (GLM-4-Flash / GLM-4V) + Vercel AI SDK
- **部署平台**：腾讯云 EdgeOne Pages

## 🚀 本地运行指南

### 1. 克隆与安装

```
git clone https://github.com/CWQ-QR/material-precheck-agent.git
cd material-precheck-agent
npm install
```

### 2. 配置环境变量

复制根目录下的 `.env.example` 为 `.env.local` 并填写。

| 变量                              | 说明                | 示例                                     |
| --------------------------------- | ------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 项目地址   | `https://xxxx.supabase.co`             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 key   | -                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase 服务端密钥 | -                                        |
| `AI_API_KEY`                    | 智谱 API Key        | -                                        |
| `AI_BASE_URL`                   | 智谱接口地址        | `https://open.bigmodel.cn/api/paas/v4` |
| `AI_MODEL`                      | 文本模型            | `glm-4-flash`                          |
| `AI_VISION_MODEL`               | 视觉模型            | `glm-4v-flash`                         |

### 3. 启动项目

npm run dev
打开浏览器访问 `http://localhost:3000` 即可。

## 👨‍💻 团队信息

- **参赛赛事**：第九届传智杯全国大学生 IT 技能大赛
- **参赛形式**：个人赛
- **参赛选手**：蔡文权
- **参赛院校**：广州理工学院
- **GitHub**：[@CWQ-QR](https://github.com/CWQ-QR)
