import { ReactNode } from "react";

type Props = {
    eyebrow?: string;
    title: string;
    description?: string;
    children: ReactNode;
};

export default function ScreeningCardShell({
    eyebrow,
    title,
    description,
    children,
}: Props) {
    return (
        <section className="mx-auto w-full max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur md:p-8">
            {eyebrow ? (
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                    {eyebrow}
                </p>
            ) : null}

            <h1
                className="mt-3 text-3xl leading-tight text-white md:text-4xl"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
                {title}
            </h1>

            {description ? (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-[15px]">
                    {description}
                </p>
            ) : null}

            <div className="mt-8">{children}</div>
        </section>
    );
}