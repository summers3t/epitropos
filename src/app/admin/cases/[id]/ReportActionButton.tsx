"use client";

type ReportActionButtonProps = {
    children: React.ReactNode;
    className: string;
    formAction?: (formData: FormData) => void | Promise<void>;
    confirmMessage?: string;
};

const REPORTS_OPEN_KEY = "epitropos-admin-reports-open";
const REPORT_RESTORE_KEY = "epitropos-admin-reports-restore";

type ReportRestorePayload = {
    scrollY: number;
};

export default function ReportActionButton({
    children,
    className,
    formAction,
    confirmMessage,
}: ReportActionButtonProps) {
    function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (confirmMessage) {
            const confirmed = window.confirm(confirmMessage);

            if (!confirmed) {
                event.preventDefault();
                return;
            }
        }

        const payload: ReportRestorePayload = {
            scrollY: window.scrollY,
        };

        window.sessionStorage.setItem(REPORTS_OPEN_KEY, "true");
        window.sessionStorage.setItem(
            REPORT_RESTORE_KEY,
            JSON.stringify(payload)
        );
    }

    return (
        <button
            type="submit"
            formAction={formAction}
            onClick={handleClick}
            className={className}
        >
            {children}
        </button>
    );
}