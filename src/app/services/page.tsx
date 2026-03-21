export default function ServicesPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold mb-6">Services</h1>

      <p className="text-lg opacity-80 mb-10">
        Epitropos provides independent investment analysis before a property
        purchase is made.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-3">Core Analysis</h2>
          <p className="opacity-85 mb-4">
            Evaluation of up to 3 candidate properties.
          </p>
          <ul className="space-y-2 opacity-80">
            <li>Location analysis</li>
            <li>LTR income scenario</li>
            <li>Renovation risk</li>
            <li>Liquidity review</li>
            <li>Written verdict</li>
          </ul>
        </section>

        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-3">Strategic Analysis</h2>
          <p className="opacity-85 mb-4">
            Evaluation of up to 5 properties with deeper strategic review.
          </p>
          <ul className="space-y-2 opacity-80">
            <li>Everything in Core</li>
            <li>Multi-property comparison</li>
            <li>STR scenario review</li>
            <li>Sensitivity analysis</li>
            <li>Strategy call</li>
          </ul>
        </section>
      </div>
    </main>
  );
}