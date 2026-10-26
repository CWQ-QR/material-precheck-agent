"use client";

import { useEffect, useState } from "react";
import { fetchReportSnapshot } from "@/lib/reports";
import type { ReportSnapshot } from "@/lib/types";
import { ReportView } from "./report-view";
import {
  FailedReport,
  MissingReport,
  PendingReport,
} from "./report-states";

/** 轮询间隔（毫秒） */
const POLL_INTERVAL_MS = 2000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function isTerminal(snapshot: ReportSnapshot | null): boolean {
  return (
    snapshot?.status === "done" || snapshot?.status === "failed"
  );
}

/**
 * 报告轮询容器：
 * - 服务端已给出 initial 快照；pending 时每 2 秒查询一次 reports 表；
 * - done / failed 后立即停止轮询；组件卸载时清理定时器。
 */
export function ReportPoller({
  documentId,
  initial,
}: {
  documentId: string;
  initial: ReportSnapshot | null;
}) {
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(initial);
  // 初始即 pending 时先等一个间隔；无记录等其它情况立即查一次
  const startDelayed = initial?.status === "pending";

  useEffect(() => {
    if (isTerminal(snapshot)) return;

    let cancelled = false;

    const pollOnce = async () => {
      try {
        const next = await fetchReportSnapshot(documentId);
        if (!cancelled) setSnapshot(next);
        return next;
      } catch (error) {
        // 单次查询失败（如网络抖动）不中断轮询
        console.warn("[report] 轮询查询失败:", error);
        return null;
      }
    };

    const loop = async () => {
      if (startDelayed) {
        await sleep(POLL_INTERVAL_MS);
        if (cancelled) return;
      }

      while (!cancelled) {
        const next = await pollOnce();
        if (cancelled || isTerminal(next)) return;
        await sleep(POLL_INTERVAL_MS);
      }
    };

    void loop();

    return () => {
      cancelled = true;
    };
    // 仅在挂载时依据初始状态启动一次轮询循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, startDelayed]);

  if (!snapshot) {
    return <MissingReport />;
  }

  if (snapshot.status === "pending") {
    return <PendingReport />;
  }

  if (snapshot.status === "failed" || !snapshot.result) {
    return <FailedReport errorMessage={snapshot.errorMessage} />;
  }

  return <ReportView documentId={documentId} result={snapshot.result} />;
}
