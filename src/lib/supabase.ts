import { createClient } from "@supabase/supabase-js";

/**
 * 浏览器端 Supabase 客户端（使用 anon key，受 RLS 保护）。
 * 服务端需要绕过 RLS 的场景请改用 SUPABASE_SERVICE_ROLE_KEY 单独初始化，
 * 切勿在客户端组件中引用 service role key。
 */
const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrlRaw || !supabaseAnonKey) {
  throw new Error(
    "缺少 Supabase 环境变量：请在 .env.local 中配置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

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

const supabaseUrl = normalizeSupabaseUrl(supabaseUrlRaw);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
