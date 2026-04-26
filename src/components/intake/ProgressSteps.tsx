type Props = {
    steps: string[];
    current: number;
};

export default function ProgressSteps({ steps, current }: Props) {
    return (
        <div className="mb-8 flex flex-wrap items-center gap-3">
            {steps.map((step, index) => {
                const isActive = index === current;
                const isDone = index < current;

                return (
                    <div key={step} className="flex items-center gap-3">
                        <div
                            className={[
                                "flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold transition",
                                isActive
                                    ? "border-stone bg-stone text-navy"
                                    : isDone
                                        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
                                        : "border-white/15 bg-black/20 text-white/55",
                            ].join(" ")}
                        >
                            {index + 1}
                        </div>

                        <div
                            className={[
                                "text-[11px] uppercase tracking-[0.18em]",
                                isActive
                                    ? "text-white"
                                    : isDone
                                        ? "text-emerald-100/85"
                                        : "text-white/45",
                            ].join(" ")}
                        >
                            {step}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}