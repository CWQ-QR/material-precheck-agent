import type { IssueType, PrecheckIssue } from "@/lib/types";

interface IssueTypeMeta {
  label: string;
  badgeClass: string;
  accentClass: string;
}

const ISSUE_TYPE_META: Record<IssueType, IssueTypeMeta> = {
  missing: {
    label: "缺失",
    badgeClass: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
    accentClass: "border-l-red-400",
  },
  mismatch: {
    label: "矛盾",
    badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    accentClass: "border-l-amber-400",
  },
  format: {
    label: "格式不符",
    badgeClass: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    accentClass: "border-l-sky-400",
  },
  ambiguous: {
    label: "表述歧义",
    badgeClass: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20",
    accentClass: "border-l-violet-400",
  },
};

export function IssueCard({
  issue,
  index,
}: {
  issue: PrecheckIssue;
  index: number;
}) {
  const meta = ISSUE_TYPE_META[issue.type];

  return (
    <article
      className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${meta.accentClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold leading-7 text-slate-900">
          <span className="mr-2 text-slate-400">
            {String(index + 1).padStart(2, "0")}
          </span>
          {issue.description}
        </h3>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-600">
        <svg
          className="mt-1 h-4 w-4 shrink-0 text-indigo-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <span className="font-medium text-slate-700">修改建议：</span>
          {issue.suggestion}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        {issue.source_quote ? (
          <figure className="rounded-xl border-l-4 border-slate-300 bg-slate-50 px-4 py-3">
            <figcaption className="text-xs font-medium text-slate-500">
              原文依据
            </figcaption>
            <blockquote className="mt-1 text-sm leading-6 text-slate-600">
              {issue.source_quote}
            </blockquote>
          </figure>
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-600">
            <span aria-hidden>⚠️</span>
            原文未提及，请人工核对
          </p>
        )}
      </div>
    </article>
  );
}
