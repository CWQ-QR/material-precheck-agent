import { createOpenAI } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";
import type { LanguageModelV4Middleware } from "@ai-sdk/provider";

/**
 * 智谱大模型客户端（OpenAI 兼容协议）。
 * baseURL / apiKey 均来自服务端环境变量，切勿添加 NEXT_PUBLIC_ 前缀。
 */
const apiKey = process.env.AI_API_KEY;
const baseURL = process.env.AI_BASE_URL;
const modelName = process.env.AI_MODEL ?? "glm-4-flash";
// 视觉模型：用于从图片材料中 OCR 提取文字（glm-4v-flash 免费且兼容 OpenAI 格式）
const visionModelName = process.env.AI_VISION_MODEL ?? "glm-4v-flash";

/**
 * 懒加载校验：环境变量缺失不能在模块顶层 throw——
 * 否则线上部署未配置 AI_ 变量时，路由模块导入即崩、错误无法被
 * 路由的 try/catch 捕获（报告会永远卡在 pending）。
 * 放到首次调用时抛出，路由可捕获并把报告置为 failed。
 */
function assertAiConfigured(): { apiKey: string; baseURL: string } {
  if (!apiKey || !baseURL) {
    throw new Error(
      "缺少 AI 环境变量：请在部署平台配置 AI_API_KEY 与 AI_BASE_URL"
    );
  }
  return { apiKey, baseURL };
}

/**
 * @ai-sdk/openai v4 适配智谱（open.bigmodel.cn）有两个坑：
 * 1. 默认调用 openai(modelId) 走 OpenAI Responses API（/responses），
 *    智谱仅兼容 Chat Completions，必须用 openai.chat() 显式指定；
 * 2. AI SDK v7 的 generateObject 默认下发
 *    response_format: { type: "json_schema", strict: true }，
 *    智谱 glm 系列（尤其 flash）会忽略它并返回普通文本，导致解析失败；
 *    智谱支持的是 { type: "json_object" }。
 *
 * 此中间件在请求发出前把带 schema 的 responseFormat 降级为纯 json 模式，
 * 由 OpenAI provider 转成 response_format={type:"json_object"}；
 * 输出结构由提示词中的 JSON 契约约束，结果仍由 Zod Schema 校验。
 */
const zhipuJsonModeMiddleware: LanguageModelV4Middleware = {
  specificationVersion: "v4",
  transformParams: async ({ params }) => {
    if (params.responseFormat?.type === "json") {
      return {
        ...params,
        responseFormat: { type: "json" },
      };
    }
    return params;
  },
};

/** OpenAI 兼容客户端实例（指向智谱 open.bigmodel.cn，懒加载缓存） */
let cachedOpenai: ReturnType<typeof createOpenAI> | null = null;

function getOpenAI() {
  if (!cachedOpenai) {
    const { apiKey: key, baseURL: url } = assertAiConfigured();
    cachedOpenai = createOpenAI({ baseURL: url, apiKey: key, name: "zhipu" });
  }
  return cachedOpenai;
}

/** 预审任务使用的模型：Chat Completions 通道 + json_object 兼容包装 */
export function precheckModel() {
  return wrapLanguageModel({
    model: getOpenAI().chat(modelName),
    middleware: zhipuJsonModeMiddleware,
  });
}

/**
 * 图片 OCR 使用的视觉模型。
 * generateText 不下发 response_format，无需 json 兼容中间件，
 * 直接走 Chat Completions 的多模态消息（image_url + base64 data URL）。
 */
export function visionModel() {
  return getOpenAI().chat(visionModelName);
}

/** 纯文本生成（补正说明等工具能力）：无需 json 兼容中间件 */
export function chatModel() {
  return getOpenAI().chat(modelName);
}
