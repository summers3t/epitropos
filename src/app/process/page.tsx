export default function ProcessPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold mb-6">Process</h1>

      <p className="text-lg opacity-80 mb-10">
        The process is designed to filter risk before a property purchase is
        made.
      </p>

      <div className="space-y-4">
        <div className="border border-white/10 rounded-xl p-5">
          1. Apply for Screening
        </div>
        <div className="border border-white/10 rounded-xl p-5">
          2. Short screening call
        </div>
        <div className="border border-white/10 rounded-xl p-5">
          3. Independent analysis
        </div>
        <div className="border border-white/10 rounded-xl p-5">
          4. Written report and verdict
        </div>
      </div>
    </main>
  );
}