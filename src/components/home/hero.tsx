import Link from "next/link";

const FEATURES = [
  {
    title: "智能查漏",
    description: "自动比对办事要求，识别缺失材料",
  },
  {
    title: "矛盾核验",
    description: "交叉检查日期、金额、身份等关键字段",
  },
  {
    title: "一次通过",
    description: "提前补齐问题，少跑窗口少排队",
  },
];

export function Hero() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-50 font-sans">
      {/* 背景光晕与网格 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/60 via-violet-200/50 to-sky-200/60 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-28 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          AI 驱动 · 办事材料智能预审
        </span>

        <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.15]">
          材料一次过
          <span className="mt-2 block bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 bg-clip-text text-transparent">
            办事材料预审 Agent
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
          上传材料，提前发现缺漏与矛盾，让办事不再来回跑。
        </p>

        <Link
          href="/upload"
          className="group mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-10 text-lg font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
        >
          开始预审
          <svg
            className="h-5 w-5 transition-transform group-hover:translate-x-1"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
              clipRule="evenodd"
            />
          </svg>
        </Link>

        <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 text-left shadow-sm backdrop-blur transition-shadow hover:shadow-md"
            >
              <p className="text-sm font-semibold text-slate-900">
                {feature.title}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
