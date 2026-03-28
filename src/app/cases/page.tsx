import Link from "next/link";

const caseExamples = [
  {
    label: "Case Example 01",
    title: "Thessaloniki Studio",
    price: "€89,000",
    advertised: "Advertised STR yield: 8%",
    reality: "Realistic estimated yield: 4.9%",
    issue: "Hidden issue: electrical system replacement",
    verdict: "Do Not Buy",
  },
  {
    label: "Case Example 02",
    title: "1 Bedroom Apartment",
    price: "€72,000",
    advertised: "Estimated LTR yield: 6.3%",
    reality: "Renovation budget: €12,000",
    issue: "Price only makes sense below a lower entry point",
    verdict: "Buy Only Below €68,000",
  },
];

export default function CasesPage() {
  return (
    <div className="-mx-6 -my-12">
      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
            Cases
          </p>

          <h1
            className="mt-6 max-w-[920px] text-5xl leading-[1.02] text-white md:text-7xl"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Example cases.
            <br />
            <span className="italic text-stone">
              The point is not optimism. The point is judgment.
            </span>
          </h1>

          <p className="mt-8 max-w-[780px] text-base leading-8 text-white/68 md:text-lg">
            These examples illustrate how Epitropos approaches investment
            decisions before purchase. The objective is not to confirm a buyer’s
            hopes. The objective is to test whether the deal actually makes
            sense.
          </p>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto grid w-full max-w-[1440px] gap-0 px-6 md:grid-cols-2">
          {caseExamples.map((item, index) => (
            <article
              key={item.title}
              className="relative py-16 md:min-h-[420px] md:py-20"
            >
              {index < caseExamples.length - 1 ? (
                <div className="pointer-events-none absolute right-0 top-1/2 hidden h-[64%] w-px -translate-y-1/2 bg-white/10 md:block" />
              ) : null}

              <div className="max-w-[480px] md:px-10">
                <p className="text-[11px] uppercase tracking-[0.24em] text-gold/85">
                  {item.label}
                </p>

                <h2
                  className="mt-5 text-4xl leading-tight text-white md:text-5xl"
                  style={{
                    fontFamily:
                      '"Baskerville", "Times New Roman", Georgia, serif',
                  }}
                >
                  {item.title}
                </h2>

                <div className="mt-8 space-y-4">
                  <p className="text-[15px] leading-7 text-white/82">
                    {item.price}
                  </p>
                  <p className="text-[15px] leading-7 text-white/62">
                    {item.advertised}
                  </p>
                  <p className="text-[15px] leading-7 text-white/62">
                    {item.reality}
                  </p>
                  <p className="text-[15px] leading-7 text-white/62">
                    {item.issue}
                  </p>
                </div>

                <div className="mt-10">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gold/85">
                    Verdict
                  </p>
                  <p
                    className="mt-3 text-[28px] leading-[1.1] text-white md:text-[32px]"
                    style={{
                      fontFamily:
                        '"Baskerville", "Times New Roman", Georgia, serif',
                    }}
                  >
                    {item.verdict}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <div className="max-w-[760px]">
            <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
              Real Objective
            </p>

            <p className="mt-6 text-base leading-8 text-white/68 md:text-lg">
              The examples are illustrative, not promotional. The role of the
              service is to make weak opportunities visible before they become
              expensive commitments.
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
