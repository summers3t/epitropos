"use client";

import { useEffect, useMemo, useRef } from "react";

type RoadmapStepState = "complete" | "current" | "upcoming";

type RoadmapStep = {
  label: string;
  state: RoadmapStepState;
  note: string;
};

type AnalysisRoadmapDesktopProps = {
  roadmap: RoadmapStep[];
  getRoadmapStateLabel: (state: RoadmapStepState) => string;
  getRoadmapNodeClasses: (state: RoadmapStepState) => {
    node: string;
    line: string;
    card: string;
    title: string;
    text: string;
  };
};

export default function AnalysisRoadmapDesktop({
  roadmap,
  getRoadmapStateLabel,
  getRoadmapNodeClasses,
}: AnalysisRoadmapDesktopProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const currentIndex = useMemo(() => {
    const found = roadmap.findIndex((step) => step.state === "current");
    return found === -1 ? 0 : found;
  }, [roadmap]);

  const progressWidth = useMemo(() => {
    if (roadmap.length <= 1) return 0;
    return (
      (currentIndex / (roadmap.length - 1)) * (roadmap.length * 220 - 180)
    );
  }, [currentIndex, roadmap.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const activeCard = container.querySelector<HTMLElement>(
      `[data-roadmap-current="true"]`,
    );
    if (!activeCard) return;

    const containerWidth = container.clientWidth;
    const targetLeft =
      activeCard.offsetLeft - containerWidth / 2 + activeCard.clientWidth / 2;

    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  }, [currentIndex, roadmap]);

  useEffect(() => {
    const onResize = () => {
      const container = scrollRef.current;
      if (!container) return;

      const activeCard = container.querySelector<HTMLElement>(
        `[data-roadmap-current="true"]`,
      );
      if (!activeCard) return;

      const containerWidth = container.clientWidth;
      const targetLeft =
        activeCard.offsetLeft - containerWidth / 2 + activeCard.clientWidth / 2;

      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "auto",
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="roadmap-scroll-shell relative overflow-x-auto overflow-y-visible pb-10 pt-2"
    >
      <div className="min-w-max px-2">
        <div className="relative" style={{ width: `${roadmap.length * 220}px` }}>
          <div className="absolute inset-0 overflow-hidden rounded-[28px]">
            <div className="roadmap-section-bg" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,248,239,0.10)_26%,rgba(239,231,216,0.26)_100%)]" />
          </div>

          <div className="absolute left-[90px] right-[90px] top-[24px] roadmap-line-glow" />

          <div
            className="absolute left-[90px] top-[24px] h-[2px] rounded-full bg-gradient-to-r from-[#d4b06b] to-[#f3e7d0] shadow-[0_0_10px_#d4b06b] transition-all duration-1000"
            style={{ width: `${progressWidth}px` }}
          />

          <div
            className="relative grid gap-6"
            style={{ gridTemplateColumns: `repeat(${roadmap.length}, minmax(180px, 1fr))` }}
          >
            {roadmap.map((step, index) => {
              const stateLabel = getRoadmapStateLabel(step.state);
              const styles = getRoadmapNodeClasses(step.state);
              const isCurrent = step.state === "current";

              return (
                <div
                  key={`${step.label}-${index}`}
                  data-roadmap-current={isCurrent ? "true" : "false"}
                  className={`flex flex-col items-center ${isCurrent ? "z-[2]" : "z-[1]"}`}
                >
                  <div
                    className={`z-10 mb-8 flex h-10 w-10 items-center justify-center rounded-full border text-[12px] font-semibold tracking-[0.08em] transition-all duration-500 ${styles.node}`}
                  >
                    {index + 1}
                  </div>

                  <div
                    className={`client-interactive group relative w-full rounded-[24px] border p-5 transition-all duration-700 ${styles.card} ${
                      isCurrent ? "translate-y-[-12px] scale-[1.03]" : "hover:grayscale-0 hover:opacity-80"
                    }`}
                  >
                    <div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />

                    <span className="relative text-[9px] font-bold uppercase tracking-[0.22em] opacity-50">
                      {stateLabel}
                    </span>

                    <h3
                      className={`relative mt-3 text-lg ${styles.title}`}
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {step.label}
                    </h3>

                    <p className={`relative mt-3 text-[12px] leading-relaxed ${styles.text}`}>
                      {step.note}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}