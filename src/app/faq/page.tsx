import Link from "next/link";

const faqs = [
  {
    question: "Do you sell property?",
    answer:
      "No. Epitropos provides independent investment advisory only. It does not operate as a brokerage, listing portal, or sourcing platform.",
  },
  {
    question: "Do you receive broker commissions?",
    answer:
      "No. Revenue comes only from the client. That is the point of the model and the reason the analysis can remain independent.",
  },
  {
    question: "Can you guarantee profit?",
    answer:
      "No. The purpose of the analysis is not to guarantee outcomes. The purpose is to evaluate risk, pricing logic, and investment quality before commitment.",
  },
  {
    question: "Do I need to identify a property before applying?",
    answer:
      "No. A target property helps, but it is not mandatory at screening stage. Some clients apply before narrowing their shortlist.",
  },
  {
    question: "Do you provide legal or mortgage services?",
    answer:
      "No. Epitropos provides investment analysis and decision guidance. Legal representation and mortgage brokerage remain separate professional functions.",
  },
  {
    question: "Why is screening required?",
    answer:
      "Because not every case is a fit. Screening helps determine whether the service can add value before a commercial engagement begins.",
  },
];

export default function FaqPage() {
  return (
    <div className="-mx-6 -my-12">
      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:py-24">
          <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
            FAQ
          </p>

          <h1
            className="mt-6 max-w-[900px] text-5xl leading-[1.02] text-white md:text-7xl"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Clear answers.
            <br />
            <span className="italic text-stone">No soft language.</span>
          </h1>

          <p className="mt-8 max-w-[760px] text-base leading-8 text-white/68 md:text-lg">
            The role of this page is not to overwhelm. It is to remove the most
            obvious sources of confusion before screening begins.
          </p>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-6">
          {faqs.map((item, index) => (
            <article
              key={item.question}
              className={`grid gap-6 py-10 md:grid-cols-[0.95fr_1.05fr] md:gap-14 md:py-12 ${
                index < faqs.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <div>
                <h2
                  className="text-[28px] leading-[1.12] text-white md:text-[34px]"
                  style={{
                    fontFamily:
                      '"Baskerville", "Times New Roman", Georgia, serif',
                  }}
                >
                  {item.question}
                </h2>
              </div>

              <div className="max-w-[760px]">
                <p className="text-[15px] leading-8 text-white/62 md:text-base">
                  {item.answer}
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
              Still Relevant
            </p>

            <p className="mt-6 text-base leading-8 text-white/68 md:text-lg">
              If the case remains relevant after these answers, the next step is
              screening — not prolonged speculation.
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
