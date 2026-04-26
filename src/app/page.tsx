import Link from "next/link";

const plans = [
  {
    name: "Foundation",
    body: "Подрежда случая, преди да тръгнете в грешна посока.",
  },
  {
    name: "Evaluation",
    body: "Показва дали конкретният имот си струва, преди да се обвържете.",
    featured: true,
  },
  {
    name: "Guidance",
    body: "Превежда ви през сделката и първите важни стъпки след нея.",
  },
];

const steps = [
  {
    number: "01",
    title: "Readiness Check",
    body: "Кратък първи филтър, който показва има ли смислен сигнал за следващ етап.",
  },
  {
    number: "02",
    title: "Serious Screening",
    body: "По-сериозна втора стъпка за валидиране на случая и избор на правилния тип помощ.",
  },
  {
    number: "03",
    title: "Recommended Path",
    body: "След преглед се определя най-разумният следващ ход: Foundation, Evaluation или Guidance.",
  },
  {
    number: "04",
    title: "Paid Work",
    body: "Едва тогава започва реалната работа: рамка, имотен анализ или guidance.",
  },
];

export default function HomePage() {
  return (
    <div className="-mx-6 -my-12 bg-[radial-gradient(circle_at_top_left,rgba(214,207,196,0.10),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(166,139,74,0.08),transparent_22%),linear-gradient(180deg,#07101a_0%,#0b1622_50%,#09111b_100%)] text-stone">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,207,196,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(166,139,74,0.10),transparent_28%),linear-gradient(135deg,#07101a_0%,#0b1622_48%,#09111b_100%)]" />
        <div className="relative mx-auto flex min-h-[calc(76vh-72px)] w-full max-w-[1440px] items-center px-6 py-20">
          <div className="max-w-[800px]">
            <p className="text-[11px] uppercase tracking-[0.3em] text-stone/80">
              Independent Guided Acquisition
            </p>

            <h1
              className="mt-6 max-w-[760px] text-5xl leading-[0.96] text-white md:text-7xl"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Buy property in Greece
              <br />
              <span className="italic text-stone">
                with more clarity and less risk.
              </span>
            </h1>

            <p className="mt-8 max-w-[650px] text-base leading-8 text-white/70 md:text-lg">
              Epitropos is a calm, independent advisory layer between you and a
              process that is often more confusing, more fragmented, and more
              expensive to get wrong than it first appears.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/readiness-check"
                className="inline-flex items-center rounded-md bg-stone px-7 py-4 text-[12px] font-medium uppercase tracking-[0.16em] text-navy transition hover:opacity-95"
              >
                Start Readiness Check
              </Link>

              <Link
                href="/plans"
                className="inline-flex items-center rounded-md border border-white/15 bg-white/[0.02] px-7 py-4 text-[12px] uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/5 hover:text-white"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-black/[0.10]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur md:p-10">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
                Why this matters
              </p>

              <h2
                className="mt-6 max-w-[820px] text-4xl leading-[1.02] text-white md:text-6xl"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                The costly part is rarely the obvious one.
              </h2>

              <div className="mt-8 max-w-[760px] space-y-6 text-base leading-8 text-white/68">
                <p>
                  Most buyers can see the asking price. What they usually do not
                  see clearly is the interaction between area quality, document
                  risk, renovation exposure, financing pressure, negotiation
                  timing, and future usability.
                </p>
                <p>
                  That is where false confidence becomes expensive. Epitropos
                  exists to reduce the chance of getting pulled into a weak
                  deal, a weak process, or a weak strategic fit.
                </p>
              </div>
            </div>

            <div className="rounded-[32px] border border-stone/15 bg-gradient-to-b from-stone/[0.08] to-white/[0.03] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur md:p-10">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                What you are really buying
              </div>
              <ul className="mt-6 space-y-4 text-sm leading-7 text-white/82 md:text-[15px]">
                <li>• More structure before you commit</li>
                <li>• A lower chance of expensive mistakes</li>
                <li>• A calmer path through a cross-border process</li>
                <li>• Independent judgment instead of transaction pressure</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
                Plans
              </p>
              <h2
                className="mt-5 text-4xl text-white md:text-5xl"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Three levels. One logic.
              </h2>
            </div>

            <Link
              href="/plans"
              className="text-[12px] uppercase tracking-[0.16em] text-stone transition hover:text-white"
            >
              Full plan details →
            </Link>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={[
                  "rounded-[28px] border p-7 shadow-[0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur",
                  plan.featured
                    ? "border-stone/25 bg-stone/[0.08]"
                    : "border-white/10 bg-white/[0.04]",
                ].join(" ")}
              >
                <h3
                  className="text-2xl text-white"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  {plan.name}
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/74">
                  {plan.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-black/[0.10]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
                How it works
              </p>
              <h2
                className="mt-5 text-4xl text-white md:text-5xl"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                A controlled path, not a pushy funnel.
              </h2>
            </div>

            <Link
              href="/how-it-works"
              className="text-[12px] uppercase tracking-[0.16em] text-stone transition hover:text-white"
            >
              See full flow →
            </Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((item) => (
              <article
                key={item.number}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_14px_40px_rgba(0,0,0,0.12)] backdrop-blur"
              >
                <div className="text-[11px] uppercase tracking-[0.2em] text-stone/85">
                  {item.number}
                </div>
                <h3
                  className="mt-4 text-2xl text-white"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/68">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white/[0.02]">
        <div className="mx-auto max-w-[980px] px-6 py-24 text-center md:py-28">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.04] px-8 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur md:px-12 md:py-16">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
              Start here
            </p>

            <h2
              className="mt-6 text-5xl leading-[1.02] text-white md:text-7xl"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              See whether there is a real path
              <br />
              <span className="italic text-stone">before you go deeper.</span>
            </h2>

            <p className="mx-auto mt-8 max-w-[700px] text-base leading-8 text-white/68">
              The first step is short, calm, and useful. It is meant to create
              signal — not pressure.
            </p>

            <div className="mt-10">
              <Link
                href="/readiness-check"
                className="inline-flex items-center rounded-md bg-stone px-8 py-4 text-[12px] font-medium uppercase tracking-[0.16em] text-navy transition hover:opacity-95"
              >
                Start Readiness Check
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}