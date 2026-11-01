import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 浏览器端 Supabase 客户端（使用 anon key，受 RLS 保护）。
 * 服务端需要绕过 RLS 的场景请改用 SUPABASE_SERVICE_ROLE_KEY 单独初始化，
 * 切勿在客户端组件中引用 service role key。
 *
 * 注意：本模块会被打进客户端 bundle。绝不能在模块顶层 throw——
 * 否则线上构建时若 NEXT_PUBLIC_ 变量未注入，chunk 一加载即崩
 * （表现为 React Hydration/渲染错误）。缺失时降级为 null，
 * 由调用方给出友好提示。
 */
const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 将 NEXT_PUBLIC_SUPABASE_URL 规范化为项目根地址：
 * 去掉末尾斜杠，以及误填的 /rest/v1、/storage/v1 等 API 后缀。
 * 否则 SDK 会拼出 …/rest/v1/storage/v1/object/… 这类错误 URL，
 * Storage 上传会返回 "Invalid path specified in request URL"。
 */
function normalizeSupabaseUrl(raw: string): string {
  const withoutSuffix = raw
    .trim()
    .replace(/\/+(rest|storage|auth|functions)\/v\d+\/?$/i, "");
  return withoutSuffix.replace(/\/+$/, "");
}

export const supabase: SupabaseClient | null =
  supabaseUrlRaw && supabaseAnonKey
    ? createClient(normalizeSupabaseUrl(supabaseUrlRaw), supabaseAnonKey)
    : null;

if (!supabase) {
  console.error(
    "缺少 Supabase 环境变量：请在部署平台配置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY（需在构建前设置）"
  );
}

/** 调用方在 null 时的统一中文提示 */
export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  "数据库未配置（缺少 Supabase 环境变量），请在部署平台设置后重新构建";
