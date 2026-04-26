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
        <section className="space-y-10">
            <header className="max-w-4xl space-y-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                    Plans
                </p>
                <h1
                    className="text-4xl text-white md:text-6xl"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                    Три ясни нива. Един и същ принцип: по-малко хаос, по-малък риск.
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-white/72 md:text-base">
                    Не купувате „още една консултация“. Купувате правилния следващ слой
                    яснота, оценка или guidance според това къде се намирате в момента.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
                {plans.map((plan) => (
                    <article
                        key={plan.name}
                        className={[
                            "rounded-[28px] border p-6 backdrop-blur",
                            plan.featured
                                ? "border-stone/30 bg-stone/[0.08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
                                : "border-white/10 bg-white/[0.05]",
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
                                    <span className="rounded-full border border-stone/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-stone">
                                        Core choice
                                    </span>
                                ) : null}
                            </div>

                            <p className="text-sm leading-7 text-white/78">{plan.tagline}</p>
                            <p className="text-sm leading-7 text-white/58">{plan.forWho}</p>
                        </div>

                        <div className="mt-6 space-y-5">
                            <div>
                                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                                    Includes
                                </div>
                                <ul className="mt-3 space-y-2 text-sm text-white/80">
                                    {plan.includes.map((item) => (
                                        <li key={item}>• {item}</li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                                    Does not include
                                </div>
                                <ul className="mt-3 space-y-2 text-sm text-white/58">
                                    {plan.excludes.map((item) => (
                                        <li key={item}>• {item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <div className="flex flex-wrap gap-4">
                <Link
                    href="/readiness-check"
                    className="inline-flex items-center rounded-md bg-stone px-6 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-navy transition hover:opacity-95"
                >
                    Start Readiness Check
                </Link>
                <Link
                    href="/how-it-works"
                    className="inline-flex items-center rounded-md border border-white/15 px-6 py-3 text-[12px] uppercase tracking-[0.14em] text-white/75 transition hover:bg-white/5 hover:text-white"
                >
                    See how it works
                </Link>
            </div>
        </section>
    );
}