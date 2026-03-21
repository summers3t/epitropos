"use client";

type DecisionActionButtonProps = {
    children: React.ReactNode;
    className: string;
};

const DECISION_RESTORE_KEY = "epitropos-admin-decision-restore";

type DecisionRestorePayload = {
    scrollY: number;
};

export default function DecisionActionButton({
    children,
    className,
}: DecisionActionButtonProps) {
    function handleClick() {
        const payload: DecisionRestorePayload = {
            scrollY: window.scrollY,
        };

        window.sessionStorage.setItem(
            DECISION_RESTORE_KEY,
            JSON.stringify(payload)
        );
    }

    return (
        <button
            type="submit"
            onClick={handleClick}
            className={className}
        >
            {children}
        </button>
    );
}