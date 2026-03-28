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

export default function ServicesPage() {
  return (
    <div className="-mx-6 -my-12">
      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
            Services
          </p>

          <h1
            className="mt-6 max-w-[920px] text-5xl leading-[1.02] text-white md:text-7xl"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Two advisory formats.
            <br />
            <span className="italic text-stone">
              Same philosophy. Different depth.
            </span>
          </h1>

          <p className="mt-8 max-w-[760px] text-base leading-8 text-white/68 md:text-lg">
            Epitropos is not a brokerage service and not a property sourcing
            platform. The service is structured around independent pre-deal
            analysis designed to help buyers avoid bad commitments.
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
                Focused review for buyers who need a disciplined first filter.
              </h2>

              <p className="mt-6 text-[15px] leading-8 text-white/60 md:text-base">
                Best suited for buyers with a shorter shortlist who want clear
                analytical judgment before moving further into negotiation or
                commitment.
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
                Deeper review for buyers comparing options and thinking beyond a
                single listing.
              </h2>

              <p className="mt-6 text-[15px] leading-8 text-white/60 md:text-base">
                Designed for broader decision contexts where comparison,
                scenario depth, and strategic framing matter more than a simple
                go / no-go filter.
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
              Scope Boundary
            </p>

            <p className="mt-6 text-base leading-8 text-white/68 md:text-lg">
              Epitropos provides investment analysis, risk evaluation, and
              decision guidance. It does not provide property brokerage, legal
              representation, or mortgage mediation.
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
