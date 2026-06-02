"use client";

export type Unit19PanelKey = "expenses" | "documents" | "income" | "calendar";

type Props = {
    activePanel: Unit19PanelKey;
    onSwitchPanel?: (panel: Unit19PanelKey) => void;
};

const panels: Array<{ key: Unit19PanelKey; label: string; className: string; activeClassName: string }> = [
    {
        key: "expenses",
        label: "Expenses",
        className: "border-[#a68b4a]/[0.24] bg-[#a68b4a]/[0.07] text-[#7a6228] hover:border-[#a68b4a]/[0.38] hover:bg-[#a68b4a]/[0.13]",
        activeClassName: "border-[#a68b4a]/[0.40] bg-[#a68b4a]/[0.16] text-[#0f1c2e] shadow-[0_10px_24px_rgba(166,139,74,0.15)]",
    },
    {
        key: "documents",
        label: "Documents",
        className: "border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.07] text-[#1560bc] hover:border-[#2f80ed]/[0.38] hover:bg-[#2f80ed]/[0.13]",
        activeClassName: "border-[#2f80ed]/[0.40] bg-[#2f80ed]/[0.15] text-[#0f1c2e] shadow-[0_10px_24px_rgba(47,128,237,0.14)]",
    },
    {
        key: "income",
        label: "Income",
        className: "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.07] text-[#0f7448] hover:border-[#20a76b]/[0.38] hover:bg-[#20a76b]/[0.13]",
        activeClassName: "border-[#20a76b]/[0.40] bg-[#20a76b]/[0.15] text-[#0f1c2e] shadow-[0_10px_24px_rgba(32,167,107,0.14)]",
    },
    {
        key: "calendar",
        label: "Calendar",
        className: "border-[#8a65cc]/[0.24] bg-[#8a65cc]/[0.07] text-[#5e38a0] hover:border-[#8a65cc]/[0.38] hover:bg-[#8a65cc]/[0.13]",
        activeClassName: "border-[#8a65cc]/[0.40] bg-[#8a65cc]/[0.15] text-[#0f1c2e] shadow-[0_10px_24px_rgba(138,101,204,0.14)]",
    },
];

export default function Unit19ModalSwitcher({ activePanel, onSwitchPanel }: Props) {
    if (!onSwitchPanel) return null;

    return (
        <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-[15px] border border-white/[0.74] bg-white/[0.44] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
            {panels.map((panel) => {
                const active = panel.key === activePanel;

                return (
                    <button
                        key={panel.key}
                        type="button"
                        onClick={() => onSwitchPanel(panel.key)}
                        disabled={active}
                        className={[
                            "rounded-[11px] border px-2.5 py-1.5 text-[10.5px] font-semibold transition-all duration-200 active:scale-[0.97] disabled:cursor-default",
                            active ? panel.activeClassName : panel.className,
                        ].join(" ")}
                    >
                        {panel.label}
                    </button>
                );
            })}
        </div>
    );
}
