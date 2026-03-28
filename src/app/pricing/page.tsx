import Link from "next/link";

const coreItems = [
  "Evaluation of up to 3 candidate properties",
  "Location and micro-location review",
  "LTR income scenario",
  "Renovation exposure",
  "Liquidity review",
  "Written investment verdict",
];

const strategicItems = [
  "Evaluation of up to 5 properties",
  "Everything in Core Analysis",
  "Multi-property comparison",
  "STR scenario review",
  "Sensitivity analysis",
  "Strategy-oriented guidance",
];

export default function PricingPage() {
  return (
    <div className="-mx-6 -my-12">
      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
            Pricing
          </p>

          <h1
            className="mt-6 max-w-[920px] text-5xl leading-[1.02] text-white md:text-7xl"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Advisory pricing follows scope.
            <br />
            <span className="italic text-stone">Screening comes first.</span>
          </h1>

          <p className="mt-8 max-w-[760px] text-base leading-8 text-white/68 md:text-lg">
            Epitropos is not a catalogue of fixed-price transactions. Pricing is
            structured around analytical depth, property count, and decision
            complexity. Screening remains mandatory before any engagement
            begins.
          </p>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto grid w-full max-w-[1440px] gap-0 px-6 md:grid-cols-2">
          <article className="relative py-16 md:min-h-[560px] md:border-r md:border-white/10 md:py-20">
            <div className="max-w-[500px] md:px-10">
              <p className="text-[11px] uppercase tracking-[0.24em] text-gold/85">
                Core Analysis
              </p>

              <h2
                className="mt-5 text-4xl leading-tight text-white md:text-5xl"
                style={{
                  fontFamily:
                    '"Baskerville", "Times New Roman", Georgia, serif',
                }}
              >
                Built for narrower shortlists and direct acquisition decisions.
              </h2>

              <p className="mt-6 text-[15px] leading-8 text-white/60 md:text-base">
                Designed for buyers who need a disciplined first filter on a
                smaller set of properties before moving further into commitment.
              </p>

              <div className="mt-10 grid gap-0">
                {coreItems.map((item, index) => (
                  <div
                    key={item}
                    className={`py-4 ${
                      index < coreItems.length - 1
                        ? "border-b border-white/10"
                        : ""
                    }`}
                  >
                    <div className="text-[15px] leading-7 text-white/82">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="relative py-16 md:min-h-[560px] md:py-20">
            <div className="max-w-[500px] md:px-10">
              <p className="text-[11px] uppercase tracking-[0.24em] text-gold/85">
                Strategic Analysis
              </p>

              <h2
                className="mt-5 text-4xl leading-tight text-white md:text-5xl"
                style={{
                  fontFamily:
                    '"Baskerville", "Times New Roman", Georgia, serif',
                }}
              >
                Built for broader comparison, deeper modeling, and strategic
                positioning.
              </h2>

              <p className="mt-6 text-[15px] leading-8 text-white/60 md:text-base">
                Designed for buyers comparing multiple options where scenario
                depth and portfolio logic matter more than a simple go / no-go
                decision.
              </p>

              <div className="mt-10 grid gap-0">
                {strategicItems.map((item, index) => (
                  <div
                    key={item}
                    className={`py-4 ${
                      index < strategicItems.length - 1
                        ? "border-b border-white/10"
                        : ""
                    }`}
                  >
                    <div className="text-[15px] leading-7 text-white/82">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <div className="max-w-[760px]">
            <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
              Pricing Principle
            </p>

            <p className="mt-6 text-base leading-8 text-white/68 md:text-lg">
              Pricing depends on scope, not persuasion. The service is intended
              for serious buyers evaluating acquisitions where a bad decision
              would be materially expensive.
            </p>

            <p className="mt-6 text-base leading-8 text-white/68 md:text-lg">
              Typical engagements are most relevant for investors considering
              acquisitions above €80,000.
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
