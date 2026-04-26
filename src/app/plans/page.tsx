import Link from "next/link";

const plans = [
    {
        name: "Foundation",
        tagline: "Подрежда случая, преди да тръгнете в грешна посока.",
        forWho:
            "За човек без ясен имот, без ясен район или без подредена финансова рамка.",
        includes: [
            "Яснота дали случаят е работещ",
            "Изчистване на целта и ограниченията",
            "Насока какво да търсите и какво да избягвате",
            "По-ясен следващ ход",
        ],
        excludes: [
            "Пълен анализ на конкретен имот",
            "Правна и документална проверка",
            "Сделкова навигация",
        ],
    },
    {
        name: "Evaluation",
        tagline: "Показва дали конкретният имот си струва, преди да се обвържете.",
        forWho:
            "За човек с конкретен имот или shortlist, който иска реално решение, а не догадки.",
        includes: [
            "Asset fit и локационен преглед",
            "Икономика на сделката на advisory ниво",
            "Правно-документен risk review на advisory ниво",
            "Ясен verdict",
        ],
        excludes: [
            "Активно водене през капаро и договори",
            "Ongoing координация на сделката",
            "Следпридобивно стабилизиране",
        ],
        featured: true,
    },
    {
        name: "Guidance",
        tagline: "Превежда ви през сделката и първите важни стъпки след нея.",
        forWho:
            "За човек, който не иска само мнение, а по-спокоен и контролиран процес.",
        includes: [
            "Всичко от Evaluation",
            "Guidance по капаро, timing и документи",
            "По-ясен handover и първи следващи стъпки",
            "Насочване към релевантни local professionals при нужда",
        ],
        excludes: [
            "Юридическо представителство вместо адвокат",
            "Брокерска услуга",
            "Ремонтен мениджмънт вместо клиента",
        ],
    },
];

export default function PlansPage() {
    return (
        <section className="mx-auto w-full max-w-[1440px] space-y-10 px-6 py-16 md:py-20">
            <header className="max-w-4xl space-y-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                    Plans
                </p>
                <h1
                    className="text-4xl leading-tight text-white md:text-6xl"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                    Три ясни нива. Един и същ принцип: по-малко хаос, по-малък риск.
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-white/72 md:text-base">
                    Не купувате „още една консултация“. Купувате правилния следващ слой
                    яснота, оценка или guidance според това къде се намирате в момента.
                </p>
            </header>

            <div className="group grid gap-6 lg:grid-cols-3">
                {plans.map((plan) => (
                    <article
                        key={plan.name}
                        className={[
                            "rounded-[30px] border p-7 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur transition duration-300 group-hover:opacity-60 hover:-translate-y-1 hover:opacity-100 hover:shadow-[0_30px_90px_rgba(0,0,0,0.24)]",
                            plan.featured
                                ? "border-stone/25 bg-gradient-to-b from-stone/[0.10] to-white/[0.04]"
                                : "border-white/10 bg-white/[0.04]",
                        ].join(" ")}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <h2
                                    className="text-2xl text-white"
                                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                                >
                                    {plan.name}
                                </h2>
                                {plan.featured ? (
                                    <span className="rounded-full border border-stone/30 bg-stone/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-stone">
                                        Core choice
                                    </span>
                                ) : null}
                            </div>

                            <p className="text-sm leading-7 text-white/80">{plan.tagline}</p>
                            <p className="text-sm leading-7 text-white/58">{plan.forWho}</p>
                        </div>

                        <div className="mt-7 space-y-6">
                            <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                                    Includes
                                </div>
                                <ul className="mt-3 space-y-2 text-sm text-white/82">
                                    {plan.includes.map((item) => (
                                        <li key={item}>• {item}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                                    Does not include
                                </div>
                                <ul className="mt-3 space-y-2 text-sm text-white/60">
                                    {plan.excludes.map((item) => (
                                        <li key={item}>• {item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
                <div className="flex flex-wrap gap-4">
                    <Link
                        href="/readiness-check"
                        className="inline-flex items-center rounded-md bg-stone px-6 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-navy shadow-[0_12px_30px_rgba(214,207,196,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(214,207,196,0.18)]"
                    >
                        Start Readiness Check
                    </Link>
                    <Link
                        href="/how-it-works"
                        className="inline-flex items-center rounded-md border border-white/15 bg-white/[0.02] px-6 py-3 text-[12px] uppercase tracking-[0.14em] text-white/75 transition hover:bg-white/5 hover:text-white"
                    >
                        See how it works
                    </Link>
                </div>
            </div>
        </section>
    );
}