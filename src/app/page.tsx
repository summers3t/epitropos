import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[calc(100vh-72px)] overflow-hidden rounded-2xl">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/35" />
          <img
            src="https://huggingface.co/spaces/summers3t/aegean-dreams-digital-streams/resolve/main/images/Thessaloniki-Sunset-From-Eptapyrgio-Castle.jpg"
            alt="Thessaloniki"
            className="h-full w-full object-cover opacity-75"
          />
        </div>

        {/* Content wrapper */}
        <div className="relative z-10 flex min-h-[calc(100vh-72px)] items-center justify-center px-6">
          <div className="w-full max-w-3xl">
            <div className="backdrop-blur-sm bg-white/10 p-8 md:p-10 rounded-2xl shadow-glass border border-white/15 transform transition-all duration-700 hover:scale-[1.02]">
              <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fadeIn">
                Before You Buy Property in Northern Greece,
                <span className="text-gold"> Make Sure It Is Not a Bad Deal.</span>
              </h1>

              <p className="text-lg md:text-xl opacity-85 mb-8 animate-fadeIn delay-100">
                Independent investment analysis before you commit capital.
                No brokerage. No commissions. No hidden incentives.
              </p>

              <div className="flex flex-wrap gap-4 animate-fadeIn delay-200">
                <Link
                  href="/screening"
                  className="px-8 py-3 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-1 shadow-glass bg-stone text-navy hover:opacity-95"
                >
                  Apply for Screening
                </Link>

                <Link
                  href="/process"
                  className="px-8 py-3 border border-white/20 hover:bg-white/10 rounded-xl font-medium transition-all duration-300"
                >
                  How It Works
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll hint - pinned to bottom of hero, not overlapping buttons */}
          <a
            href="#next"
            className="absolute bottom-8 left-1/2 -translate-x-1/2 p-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 transition z-20"
            aria-label="Scroll down"
          >
            ↓
          </a>
        </div>
      </section>

      {/* BELOW HERO */}
      <section id="next" className="mt-24 max-w-3xl">
        <h2 className="text-2xl font-semibold">What You Get</h2>
        <ul className="mt-6 space-y-3 opacity-85">
          <li>A clear decision before you commit money.</li>
          <li>Independent review of risk, price and investment logic.</li>
          <li>A written verdict: Buy, Buy Only Below Price, or Do Not Buy.</li>
        </ul>
      </section>

      <p className="mt-8 text-sm opacity-65">
        We work with a limited number of clients each month.
      </p>
    </>
  );
}