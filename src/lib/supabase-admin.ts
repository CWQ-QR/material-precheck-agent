import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 服务端专用 Supabase 客户端（service role，绕过 RLS）。
 *
 * 安全约束：
 * - 此文件只能被 Route Handler / Server Component 等服务端模块引用；
 * - 绝不能在 'use client' 组件中导入，也不能把该 key 暴露到浏览器；
 * - SUPABASE_SERVICE_ROLE_KEY 没有 NEXT_PUBLIC_ 前缀，不会被打包进客户端。
 *
 * 注意：使用懒加载（getSupabaseAdmin）而不是模块顶层初始化——
 * 服务端组件在渲染期导入本模块，顶层 throw 会让报告页等所有引用方
 * 在线上环境变量缺失时直接 SSR 崩溃；缺失时降级返回 null，
 * 由调用方决定降级策略（页面渲染 null / 路由抛出可捕获错误）。
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
  /\/+$/,
  ""
);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "缺少服务端 Supabase 环境变量：请在部署平台配置 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY"
    );
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}

/** 服务端调用方在 null 时的统一中文提示 */
export const SUPABASE_ADMIN_NOT_CONFIGURED_MESSAGE =
  "服务端数据库未配置（缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量）";
