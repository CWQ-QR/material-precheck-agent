import type { OverallStatus } from "@/lib/types";

interface OverallMeta {
  label: string;
  textColor: string;
  badgeClass: string;
  dotClass: string;
}

const OVERALL_META: Record<OverallStatus, OverallMeta> = {
  pass: {
    label: "通过",
    textColor: "text-emerald-600",
    badgeClass: "border-emerald-200 bg-emerald-50",
    dotClass: "bg-emerald-500",
  },
  conditional: {
    label: "条件通过",
    textColor: "text-amber-600",
    badgeClass: "border-amber-200 bg-amber-50",
    dotClass: "bg-amber-500",
  },
  reject: {
    label: "不通过",
    textColor: "text-red-600",
    badgeClass: "border-red-200 bg-red-50",
    dotClass: "bg-red-500",
  },
};

export function OverallResult({ overall }: { overall: OverallStatus }) {
  const meta = OVERALL_META[overall];

  return (
    <div
      className={`flex flex-col items-center gap-4 rounded-3xl border px-8 py-10 text-center ${meta.badgeClass}`}
    >
      <span className="text-base font-medium text-slate-600">预审结果</span>
      <h2 className={`text-4xl font-bold tracking-tight sm:text-5xl ${meta.textColor}`}>
        预审结果：{meta.label}
      </h2>
      <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
        <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
        {overall === "pass" && "材料齐全，建议提交办理"}
        {overall === "conditional" && "存在需要补充或核对的问题，请按建议处理"}
        {overall === "reject" && "存在较多问题，建议整理后重新提交预审"}
      </span>
    </div>
  );
}
