import React from "react";

type Verdict = "recommended" | "rejected_all" | "watchlist" | string;

export const VerdictStamp = ({ verdict }: { verdict: Verdict }) => {
  const styles: Record<string, string> = {
    recommended:
      "border-boutique-emerald text-boutique-emerald bg-emerald-50/50",
    watchlist: "border-boutique-gold text-boutique-gold bg-amber-50/50",
    rejected_all: "border-boutique-rose text-boutique-rose bg-rose-50/50",
  };

  const labels: Record<string, string> = {
    recommended: "INVESTMENT VERDICT: BUY",
    watchlist: "BUY ≤ TARGET PRICE",
    rejected_all: "VERDICT: DO NOT BUY",
  };

  const currentStyle =
    styles[verdict] || "border-slate-500 text-slate-500 bg-slate-50/10";
  const currentLabel = labels[verdict] || "PENDING ANALYSIS";

  return (
    <div
      className={`
      inline-block px-10 py-4 border-4 rounded-sm font-serif font-black uppercase tracking-tighter
      transform -rotate-1 shadow-md transition-all hover:rotate-0
      ${currentStyle}
    `}
    >
      <span className="text-2xl md:text-3xl lg:text-4xl">{currentLabel}</span>
    </div>
  );
};
