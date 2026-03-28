import Link from "next/link";

const analysisAreas = [
  "Location and micro-location",
  "Realistic rental scenario",
  "Renovation exposure",
  "Liquidity and exit risk",
  "Financing constraints",
  "Overall investment logic",
];

const outputs = [
  "Buy",
  "Buy Only Below Price",
  "Do Not Buy",
];

export default function MethodologyPage() {
  return (
    <div className="-mx-6 -my-12">
      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
            Methodology
          </p>

          <h1
            className="mt-6 max-w-[900px] text-5xl leading-[1.02] text-white md:text-7xl"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            The analysis starts with one question:
            <br />
            <span className="italic text-stone">
              does this investment actually make sense?
            </span>
          </h1>

          <p className="mt-8 max-w-[760px] text-base leading-8 text-white/68 md:text-lg">
            Epitropos is built to reduce bad decisions before capital is
            committed. The methodology is structured, risk-first, and designed
            to produce decision clarity rather than information overload.
          </p>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto grid w-full max-w-[1440px] gap-0 px-6 md:grid-cols-[0.95fr_1.05fr]">
          <div className="py-16 md:border-r md:border-white/10 md:py-20 md:pr-14">
            <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
              What Is Analysed
            </p>

            <h2
              className="mt-5 text-4xl leading-tight text-white md:text-5xl"
              style={{ fontFamily: '"Baskerville", "Times New Roman", Georgia, serif' }}
            >
              We assess the property as an investment case, not as a sales listing.
            </h2>

            <p className="mt-6 max-w-[520px] text-[15px] leading-8 text-white/60 md:text-base">
              That means the emphasis is not on presentation, optimism, or agent
              narrative. The emphasis is on whether the numbers, risks, and
              acquisition logic support a disciplined decision.
            </p>
          </div>

          <div className="py-16 md:py-20 md:pl-14">
            <div className="grid gap-0">
              {analysisAreas.map((item, index) => (
                <div
                  key={item}
                  className={`py-5 ${
                    index < analysisAreas.length - 1 ? "border-b border-white/10" : ""
                  }`}
                >
                  <div className="text-[16px] leading-8 text-white/82">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto grid w-full max-w-[1440px] gap-0 px-6 md:grid-cols-3">
          {outputs.map((item, index) => (
            <article
              key={item}
              className="relative py-14 md:min-h-[220px] md:py-16"
            >
              {index < outputs.length - 1 ? (
                <div className="pointer-events-none absolute right-0 top-1/2 hidden h-[58%] w-px -translate-y-1/2 bg-white/10 md:block" />
              ) : null}

              <div className="max-w-[300px] md:px-10">
                <p className="text-[11px] uppercase tracking-[0.24em] text-gold/85">
                  Output
                </p>

                <h3
                  className="mt-4 text-[28px] leading-[1.1] text-white md:text-[32px]"
                  style={{ fontFamily: '"Baskerville", "Times New Roman", Georgia, serif' }}
                >
                  {item}
                </h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <div className="max-w-[760px]">
            <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
              Decision, Not Noise
            </p>

            <p className="mt-6 text-base leading-8 text-white/68 md:text-lg">
              The goal is not to impress the client with complexity. The goal is
              to deliver a clear, defensible conclusion before money is exposed
              to the wrong property.
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