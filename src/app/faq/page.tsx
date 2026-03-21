export default function FaqPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold mb-6">FAQ</h1>

      <div className="space-y-6">
        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium mb-2">Do you sell property?</h2>
          <p className="opacity-80">
            No. Epitropos provides independent advisory only.
          </p>
        </section>

        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium mb-2">
            Do you receive broker commissions?
          </h2>
          <p className="opacity-80">
            No. The service is paid only by the client.
          </p>
        </section>

        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium mb-2">
            Can you guarantee profit?
          </h2>
          <p className="opacity-80">
            No. The purpose of the analysis is to evaluate risk and investment
            logic before commitment.
          </p>
        </section>
      </div>
    </main>
  );
}