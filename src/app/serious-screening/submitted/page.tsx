import Link from "next/link";
import ScreeningCardShell from "@/components/intake/ScreeningCardShell";
import ProgressSteps from "@/components/intake/ProgressSteps";

export default function SeriousScreeningSubmittedPage() {
    return (
        <div className="space-y-6">
            <ProgressSteps
                steps={["Readiness Check", "Serious Screening", "Review"]}
                current={2}
            />

            <ScreeningCardShell
                eyebrow="Submitted"
                title="Заявката е получена"
                description="Следващата стъпка е вътрешен преглед на случая и определяне дали има смисъл да продължим нататък и кой е най-подходящият следващ етап."
            >
                <div className="space-y-5">
                    <div className="rounded-[24px] border border-white/10 bg-black/10 p-5 text-sm leading-7 text-white/72">
                        Ако случаят изглежда работещ, ще получите препоръка за най-подходящия
                        следващ етап: Foundation, Evaluation или Guidance.
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center rounded-md bg-stone px-6 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-navy transition hover:opacity-95"
                        >
                            Go to dashboard
                        </Link>

                        <Link
                            href="/plans"
                            className="inline-flex items-center rounded-md border border-white/15 px-6 py-3 text-[12px] uppercase tracking-[0.14em] text-white/75 transition hover:bg-white/5 hover:text-white"
                        >
                            Review plans
                        </Link>
                    </div>
                </div>
            </ScreeningCardShell>
        </div>
    );
}