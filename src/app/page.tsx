import Image from "next/image";
import Link from "next/link";

const cityImage =
  "https://huggingface.co/spaces/summers3t/aegean-dreams-digital-streams/resolve/main/images/Thessaloniki-Sunset-From-Eptapyrgio-Castle.jpg";

const problemImage =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80";

const principles = [
  {
    title: "Risk-First Analysis",
    body: "We test each property against pricing realism, renovation exposure, liquidity, and financing constraints before any recommendation is issued.",
  },
  {
    title: "Pure Independence",
    body: "No broker commission. No seller incentive. No pressure to approve a deal that should never happen.",
  },
  {
    title: "Institutional Rigour",
    body: "Structured advisory logic, disciplined judgment, and written conclusions designed to reduce expensive mistakes before capital is committed.",
  },
];

const processSteps = [
  {
    number: "01",
    title: "Screening",
    body: "You submit your objective, budget, and constraints. We assess fit before any engagement begins.",
  },
  {
    number: "02",
    title: "Case Opening",
    body: "Once accepted and paid, a structured advisory case is opened around your property target and decision context.",
  },
  {
    number: "03",
    title: "Field Analysis",
    body: "We evaluate candidate properties through risk, pricing, rental realism, condition, and acquisition logic.",
  },
  {
    number: "04",
    title: "Verdict",
    body: "You receive a written recommendation designed for one purpose: clarity before commitment.",
  },
];

export default function Home() {
  return (
    <div className="-mx-6 -my-12">
      <section className="relative min-h-[calc(68vh-72px)] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={cityImage}
            alt="Thessaloniki skyline"
            fill
            priority
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#05080d]/56" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060a11]/68 via-[#08101a]/42 to-[#060a11]/66" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(68vh-72px)] w-full max-w-[1440px] items-center px-6 py-14">
          <div className="max-w-[760px]">
            <p className="text-[11px] uppercase tracking-[0.30em] text-gold/90">
              Independent Advisory · Risk-First
            </p>

            <h1
              className="mt-6 max-w-[780px] text-5xl leading-[0.98] text-white md:text-7xl"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              We represent buyers.
              <br />
              <span className="italic text-stone">Not sellers.</span>
            </h1>

            <p className="mt-8 max-w-[640px] text-base leading-8 text-white/72 md:text-lg">
              Epitropos provides independent property investment analysis before
              you commit capital. No brokerage incentives. No transaction bias.
              Only decision-focused advisory designed to reduce expensive
              mistakes.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link
                href="/screening"
                className="inline-flex items-center rounded-md bg-stone px-7 py-4 text-[12px] font-medium uppercase tracking-[0.16em] text-navy transition hover:opacity-95"
              >
                Begin Screening →
              </Link>

              <Link
                href="/methodology"
                className="text-[12px] uppercase tracking-[0.18em] text-white/68 transition hover:text-white"
              >
                Our Methodology →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="-mt-px">
        <div className="mx-auto w-full max-w-[1440px] px-6">
          <div className="grid gap-0 md:grid-cols-3">
            {principles.map((item, index) => (
              <article
                key={item.title}
                className="relative py-14 md:min-h-[280px] md:py-16"
              >
                {index < principles.length - 1 ? (
                  <div className="pointer-events-none absolute right-0 top-1/2 hidden h-[62%] w-px -translate-y-1/2 bg-white/10 md:block" />
                ) : null}

                <div className="max-w-[330px] md:px-10">
                  <h2
                    className="text-[26px] leading-[1.12] tracking-[0.01em] text-white md:text-[30px]"
                    style={{
                      fontFamily:
                        '"Baskerville", "Times New Roman", Georgia, serif',
                    }}
                  >
                    {item.title}
                  </h2>

                  <p className="mt-5 max-w-[300px] text-[14px] leading-7 text-white/54 md:text-[15px]">
                    {item.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <div className="max-w-[700px]">
            <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
              The Problem
            </p>

            <h2
              className="mt-6 text-4xl leading-tight text-white md:text-6xl"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              The people showing you properties are paid to sell them.
            </h2>

            <p className="mt-8 max-w-[650px] text-base leading-8 text-white/68">
              Brokers, agents, developers, and intermediaries are usually paid
              when a transaction closes — not when you make a disciplined
              investment decision.
            </p>

            <p className="mt-6 max-w-[650px] text-base leading-8 text-white/68">
              Epitropos exists to reverse that misalignment. We are retained by
              buyers. We answer to buyers. We are compensated only by buyers.
            </p>

            <div className="mt-10">
              <Link
                href="/methodology"
                className="text-[12px] uppercase tracking-[0.18em] text-gold transition hover:text-stone"
              >
                Why independent advisory matters →
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <div className="relative w-full max-w-[620px] overflow-hidden border border-white/10 bg-black/20 aspect-[4/3]">
              <Image
                src={problemImage}
                alt="House and keys"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-18 md:py-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
                How It Works
              </p>

              <h2
                className="mt-5 text-4xl text-white md:text-5xl"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                From Screening to Verdict
              </h2>
            </div>

            <Link
              href="/process"
              className="text-[12px] uppercase tracking-[0.18em] text-gold transition hover:text-stone"
            >
              Full Process →
            </Link>
          </div>

          <div className="mt-14 grid gap-0 md:grid-cols-4">
            {processSteps.map((step, index) => (
              <div
                key={step.number}
                className={`py-8 md:py-10 ${
                  index < processSteps.length - 1
                    ? "md:border-r md:border-white/10"
                    : ""
                } ${index > 0 ? "border-t border-white/10 md:border-t-0" : ""}`}
              >
                <div className="max-w-[260px] pr-8">
                  <div className="text-[12px] uppercase tracking-[0.20em] text-gold/90">
                    {step.number}
                  </div>

                  <h3
                    className="mt-6 text-2xl text-white"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    {step.title}
                  </h3>

                  <p className="mt-5 text-sm leading-7 text-white/62">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[980px] px-6 py-24 text-center md:py-28">
          <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
            Ready To Proceed
          </p>

          <h2
            className="mt-6 text-5xl leading-[1.02] text-white md:text-7xl"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Request a screening.
            <br />
            <span className="italic text-stone">No obligation.</span>
          </h2>

          <p className="mx-auto mt-8 max-w-[700px] text-base leading-8 text-white/68">
            The screening is a short intake step that helps determine whether we
            can add value to your specific investment situation before any
            formal engagement begins.
          </p>

          <div className="mt-10">
            <Link
              href="/screening"
              className="inline-flex items-center rounded-md bg-stone px-8 py-4 text-[12px] font-medium uppercase tracking-[0.16em] text-navy transition hover:opacity-95"
            >
              Begin Screening →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
