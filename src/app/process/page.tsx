import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Apply for Screening",
    body: "The process begins with a short intake step covering budget, objective, financing context, and whether a target property already exists.",
  },
  {
    number: "02",
    title: "Short Screening Call",
    body: "A short screening call clarifies fit, investment intent, and whether Epitropos is the right advisory layer for the case.",
  },
  {
    number: "03",
    title: "Independent Analysis",
    body: "Once accepted and engaged, the property or shortlist is reviewed through risk, valuation logic, rental realism, and acquisition context.",
  },
  {
    number: "04",
    title: "Written Report and Verdict",
    body: "The client receives a written conclusion intended to support one thing above all: a clear decision before commitment.",
  },
];

export default function ProcessPage() {
  return (
    <div className="-mx-6 -my-12">
      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
            Process
          </p>

          <h1
            className="mt-6 max-w-[900px] text-5xl leading-[1.02] text-white md:text-7xl"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            A selective process.
            <br />
            <span className="italic text-stone">
              Designed to filter risk before money moves.
            </span>
          </h1>

          <p className="mt-8 max-w-[760px] text-base leading-8 text-white/68 md:text-lg">
            Epitropos is not built around volume. The process is designed to
            qualify fit, structure the case properly, and deliver a disciplined
            advisory conclusion only where it can genuinely add value.
          </p>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-6">
          {steps.map((step, index) => (
            <article
              key={step.number}
              className={`grid gap-8 py-12 md:grid-cols-[140px_1fr] md:gap-14 md:py-16 ${
                index < steps.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <div className="text-[12px] uppercase tracking-[0.24em] text-gold/90">
                {step.number}
              </div>

              <div className="max-w-[760px]">
                <h2
                  className="text-3xl leading-tight text-white md:text-4xl"
                  style={{
                    fontFamily:
                      '"Baskerville", "Times New Roman", Georgia, serif',
                  }}
                >
                  {step.title}
                </h2>

                <p className="mt-5 text-[15px] leading-8 text-white/62 md:text-base">
                  {step.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <div className="max-w-[760px]">
            <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
              Selective By Design
            </p>

            <p className="mt-6 text-base leading-8 text-white/68 md:text-lg">
              Not every inquiry becomes a client case. That selectivity is part
              of the positioning and part of the quality control.
            </p>

            <div className="mt-10">
              <Link
                href="/screening"
                className="inline-flex items-center rounded-md bg-stone px-7 py-4 text-[12px] font-medium uppercase tracking-[0.16em] text-navy transition hover:opacity-95"
              >
                Begin Screening →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
