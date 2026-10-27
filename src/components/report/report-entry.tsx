"use client";

import { useSyncExternalStore } from "react";
import { loadRequirementsForStream } from "@/lib/stream-session";
import type { ReportSnapshot } from "@/lib/types";
import { ReportPoller } from "./report-poller";
import { StreamingReport } from "./streaming-report";

/** sessionStorage 在本次流程中不会被外部推送变更，订阅保持空实现即可 */
const subscribeToSessionStorage = () => () => {};

/**
 * 报告页入口：决定「流式渲染」还是「轮询渲染」。
 * - URL 带 streaming=true、报告仍是 pending、且本地存有本次上传的办事要求
 *   → 进入 StreamingReport（打字机渐进渲染）；
 * - 其余情况（刷新、分享链接、流式已结束、报告已完成）
 *   → ReportPoller 从 Supabase 读取真实数据。
 *
 * 办事要求通过 useSyncExternalStore 从 sessionStorage 读取：
 * 服务端快照为 null（与 SSR 渲染一致，无 hydration 警告），挂载后再切换视图。
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
  const storedRequirements = useSyncExternalStore(
    subscribeToSessionStorage,
    () => loadRequirementsForStream(documentId),
    () => null
  );

  const useStreaming =
    wantsStreaming &&
    storedRequirements !== null &&
    initial?.status === "pending";

  if (useStreaming && storedRequirements !== null) {
    return (
      <StreamingReport
        documentId={documentId}
        requirements={storedRequirements}
        initial={initial}
      />
    );
  }

  return <ReportPoller documentId={documentId} initial={initial} />;
}
