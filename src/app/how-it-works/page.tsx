import Link from "next/link";

const steps = [
  {
    step: "01",
    title: "Readiness Check",
    body: "Кратък първи филтър, който показва има ли реален сигнал за смислен следващ етап.",
  },
  {
    step: "02",
    title: "Serious Screening",
    body: "По-сериозна втора стъпка, която валидира readiness-а и помага да се избере правилният вид помощ.",
  },
  {
    step: "03",
    title: "Recommended Path",
    body: "След преглед на случая се определя дали правилната следваща стъпка е Foundation, Evaluation или Guidance.",
  },
  {
    step: "04",
    title: "Paid Work",
    body: "Едва след това започва реалната работа — рамка, имотен анализ или guidance през сделката.",
  },
];

export default function HowItWorksPage() {
  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-12 px-6 py-16 md:py-20">
      <header className="max-w-4xl space-y-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
          How it works
        </p>
        <h1
          className="text-4xl leading-tight text-white md:text-6xl"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Подреден процес за нещо, което иначе лесно става хаотично.
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-white/72 md:text-base">
          Идеята не е да ви се добавя още една стъпка, а да не се налага да
          вървите на сляпо в cross-border процес, в който грешките обикновено са
          скъпи.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((item) => (
          <article
            key={item.step}
            className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.15)] backdrop-blur"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-stone/85">
              {item.step}
            </div>
            <h2
              className="mt-4 text-2xl leading-tight text-white"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {item.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/68">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
        <div className="flex flex-wrap gap-4">
          <Link
            href="/readiness-check"
            className="inline-flex items-center rounded-md bg-stone px-6 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-navy transition hover:opacity-95"
          >
            Start Readiness Check
          </Link>
          <Link
            href="/plans"
            className="inline-flex items-center rounded-md border border-white/15 bg-white/[0.02] px-6 py-3 text-[12px] uppercase tracking-[0.14em] text-white/75 transition hover:bg-white/5 hover:text-white"
          >
            View Plans
          </Link>
        </div>
      </div>
    </section>
  );
}