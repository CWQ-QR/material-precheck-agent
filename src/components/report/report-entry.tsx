"use client";

import { useEffect, useState } from "react";
import { loadRequirementsForStream } from "@/lib/stream-session";
import type { StoredRequirements } from "@/lib/stream-session";
import type { ReportSnapshot } from "@/lib/types";
import { ReportPoller } from "./report-poller";
import { StreamingReport } from "./streaming-report";

/**
 * 报告页入口：决定「流式渲染」还是「轮询渲染」。
 * - URL 带 streaming=true、报告仍是 pending、且本地存有本次上传的办事要求
 *   → 进入 StreamingReport（打字机渐进渲染）；
 * - 其余情况（刷新、分享链接、流式已结束、报告已完成）
 *   → ReportPoller 从 Supabase 读取真实数据。
 *
 * 办事要求通过 useEffect 从 sessionStorage 读取一次（挂载后）：
 * 服务端与未挂载阶段统一渲染 ReportPoller，避免 SSR 水合不一致；
 * 同时避免 useSyncExternalStore 因 getSnapshot 每次返回新对象引用导致的无限重渲染。
 */
export function ReportEntry({
  documentId,
  initial,
  wantsStreaming,
}: {
  documentId: string;
  initial: ReportSnapshot | null;
  wantsStreaming: boolean;
}) {
  const [sessionData, setSessionData] = useState<StoredRequirements | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setSessionData(loadRequirementsForStream(documentId));
    setIsMounted(true);
  }, [documentId]);

  // 防止 SSR 水合不一致，未挂载前直接渲染 Poller
  if (!isMounted) {
    return <ReportPoller documentId={documentId} initial={initial} />;
  }

  const useStreaming =
    wantsStreaming && sessionData !== null && initial?.status === "pending";

  if (useStreaming && sessionData !== null) {
    return (
      <StreamingReport
        documentId={documentId}
        sessionData={sessionData}
        initial={initial}
      />
    );
  }

  return <ReportPoller documentId={documentId} initial={initial} />;
}
