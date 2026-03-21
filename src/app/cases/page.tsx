export default function CasesPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold mb-6">
        Example Investment Cases
      </h1>

      <p className="text-lg opacity-80 mb-10">
        These examples illustrate how properties are evaluated before a
        purchase decision is made. The goal of the analysis is not to
        confirm a purchase, but to determine whether the investment
        actually makes sense.
      </p>

      <section className="space-y-10">
        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-2">
            Case Example — Thessaloniki Studio
          </h2>

          <p className="opacity-80 mb-2">
            Asking price: €89,000
          </p>

          <p className="opacity-80 mb-2">
            Advertised STR yield: 8%
          </p>

          <p className="opacity-80 mb-4">
            Realistic estimated yield: 4.9%
          </p>

          <p className="font-medium">
            Verdict: Do Not Buy
          </p>
        </div>

        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-2">
            Case Example — 1 Bedroom Apartment
          </h2>

          <p className="opacity-80 mb-2">
            Asking price: €72,000
          </p>

          <p className="opacity-80 mb-2">
            Estimated LTR yield: 6.3%
          </p>

          <p className="opacity-80 mb-4">
            Renovation budget: €12,000
          </p>

          <p className="font-medium">
            Verdict: Buy Only Below €68,000
          </p>
        </div>
      </section>

      <div className="mt-16">
        <a
          href="/screening"
          className="inline-block px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 transition"
        >
          Apply for Screening
        </a>
      </div>
    </main>
  );
}