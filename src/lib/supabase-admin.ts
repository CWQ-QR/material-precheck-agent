import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 服务端专用 Supabase 客户端（service role，绕过 RLS）。
 *
 * 安全约束：
 * - 此文件只能被 Route Handler / Server Component 等服务端模块引用；
 * - 绝不能在 'use client' 组件中导入，也不能把该 key 暴露到浏览器；
 * - SUPABASE_SERVICE_ROLE_KEY 没有 NEXT_PUBLIC_ 前缀，不会被打包进客户端。
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
  /\/+$/,
  ""
);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "缺少服务端 Supabase 环境变量：请在 .env.local 中配置 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
