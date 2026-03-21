export default function PricingPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold mb-6">Pricing</h1>

      <p className="text-lg opacity-80 mb-10">
        Advisory pricing depends on scope. Screening is required before any
        engagement begins.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-3">Core Analysis</h2>
          <p className="opacity-85">
            Designed for specific property decisions and smaller candidate sets.
          </p>
        </section>

        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-3">Strategic Analysis</h2>
          <p className="opacity-85">
            Designed for broader acquisition strategy and deeper scenario work.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm opacity-70">
        Typical engagements are suitable for investors considering acquisitions
        above €80,000.
      </p>
    </main>
  );
}