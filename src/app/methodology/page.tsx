export default function MethodologyPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold mb-6">Methodology</h1>

      <p className="text-lg opacity-80 mb-10">
        The analysis focuses on one question: does the investment actually make
        sense before capital is committed?
      </p>

      <div className="space-y-6">
        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-2">What is analysed</h2>
          <ul className="space-y-2 opacity-85">
            <li>Location and micro-location</li>
            <li>Realistic rental scenario</li>
            <li>Renovation exposure</li>
            <li>Liquidity and exit risk</li>
            <li>Overall investment logic</li>
          </ul>
        </section>

        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-2">What you receive</h2>
          <p className="opacity-85">
            A clear written verdict:
          </p>
          <div className="mt-4 space-y-2 font-medium">
            <div>Buy</div>
            <div>Buy Only Below Price</div>
            <div>Do Not Buy</div>
          </div>
        </section>
      </div>
    </main>
  );
}