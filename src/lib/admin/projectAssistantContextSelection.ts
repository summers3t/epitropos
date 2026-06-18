type JsonRecord = Record<string, unknown>;

const MAX_CONTEXT_CHARACTERS = 11_500;

const INTENT_KEYWORDS = {
    progress: [
        "до къде",
        "докъде",
        "какво следва",
        "напредък",
        "статус",
        "overview",
        "progress",
        "next",
        "current",
        "свършихме",
        "приоритет",
        "risk",
        "риск",
    ],
    roadmap: ["stage", "stages", "task", "tasks", "етап", "етапи", "задача", "задачи", "roadmap"],
    calendar: ["calendar", "event", "events", "календар", "събитие", "събития", "срок", "срокове"],
    documents: ["document", "documents", "документ", "документи", "файл", "файлове", "липсва"],
    expenses: ["expense", "expenses", "разход", "разходи", "платено", "плащане", "цена", "cost"],
    budget: ["budget", "бюджет", "rent", "наем", "credit", "кредит", "income", "доход", "застрахов"],
    property: [
        "property",
        "имот",
        "acquisition",
        "придобиване",
        "utility",
        "utilities",
        "партида",
        "партиди",
        "tenant",
        "наемател",
        "contact",
        "контакт",
    ],
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
    return isRecord(value) ? value : {};
}

function asArray(value: unknown): JsonRecord[] {
    return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normalizeSearchText(value: string) {
    return value
        .toLocaleLowerCase("bg-BG")
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

function includesIntent(message: string, keywords: string[]) {
    return keywords.some((keyword) => message.includes(normalizeSearchText(keyword)));
}

function getSearchTerms(message: string) {
    const ignored = new Set([
        "какво",
        "как",
        "къде",
        "кои",
        "коя",
        "кой",
        "има",
        "няма",
        "сме",
        "сега",
        "това",
        "тези",
        "дали",
        "може",
        "трябва",
        "моля",
        "tell",
        "show",
        "what",
        "which",
        "where",
        "about",
        "with",
        "from",
        "have",
    ]);

    const intentTerms = new Set(
        Object.values(INTENT_KEYWORDS)
            .flat()
            .flatMap((keyword) => normalizeSearchText(keyword).split(" ")),
    );

    return [...new Set(normalizeSearchText(message).split(" "))].filter(
        (term) => term.length >= 4 && !ignored.has(term) && !intentTerms.has(term),
    );
}

function clipText(value: unknown, maxLength = 220) {
    if (typeof value !== "string") return value ?? null;
    const compact = value.replace(/\s+/g, " ").trim();
    return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}…`;
}

function searchableText(record: JsonRecord) {
    return normalizeSearchText(
        Object.values(record)
            .filter((value) => typeof value === "string" || typeof value === "number")
            .join(" "),
    );
}

function matchingRecords(records: JsonRecord[], terms: string[], limit: number) {
    if (terms.length === 0) return records.slice(0, limit);

    const matched = records.filter((record) => {
        const haystack = searchableText(record);
        return terms.some((term) => haystack.includes(term));
    });

    return (matched.length > 0 ? matched : records).slice(0, limit);
}

function taskSummary(record: JsonRecord) {
    return {
        id: record.id ?? null,
        stage_id: record.stage_id ?? null,
        title: clipText(record.title, 180),
        status: record.status ?? null,
        priority: record.priority ?? null,
        due_date: record.due_date ?? null,
        completed_at: record.completed_at ?? null,
        note: clipText(record.note, 240),
    };
}

function stageSummary(record: JsonRecord) {
    return {
        id: record.id ?? null,
        title: clipText(record.title, 180),
        status: record.status ?? null,
        sort_order: record.sort_order ?? null,
        description: clipText(record.description, 220),
    };
}

function calendarSummary(record: JsonRecord) {
    return {
        id: record.id ?? null,
        task_id: record.task_id ?? null,
        title: clipText(record.title, 180),
        item_date: record.item_date ?? null,
        item_time: record.item_time ?? null,
        type: record.type ?? null,
        priority: record.priority ?? null,
        status: record.status ?? null,
        location: clipText(record.location, 120),
        note: clipText(record.note, 220),
    };
}

function expenseSummary(record: JsonRecord) {
    return {
        id: record.id ?? null,
        title: clipText(record.title, 180),
        category: record.category ?? null,
        amount_eur: record.amount_eur ?? null,
        amount_bgn: record.amount_bgn ?? null,
        expense_date: record.expense_date ?? null,
        status: record.status ?? null,
        issuer: clipText(record.issuer, 120),
        note: clipText(record.note, 180),
    };
}

function documentSummary(record: JsonRecord) {
    return {
        id: record.id ?? null,
        category_id: record.category_id ?? null,
        title: clipText(record.title, 180),
        status: record.status ?? null,
        priority: record.priority ?? null,
        document_date: record.document_date ?? null,
        next_action: clipText(record.next_action, 220),
        control_note: clipText(record.control_note, 220),
        proves: clipText(record.proves, 180),
        has_file: Boolean(record.has_file),
    };
}

function budgetMonthSummary(record: JsonRecord) {
    return {
        year: record.year ?? null,
        month: record.month ?? null,
        rent_expected_eur: record.rent_expected_eur ?? null,
        rent_paid_eur: record.rent_paid_eur ?? null,
        rent_paid_date: record.rent_paid_date ?? null,
        rent_status: record.rent_status ?? null,
        electricity_confirmed: record.electricity_confirmed ?? null,
        water_confirmed: record.water_confirmed ?? null,
        gas_confirmed: record.gas_confirmed ?? null,
        building_fees_confirmed: record.building_fees_confirmed ?? null,
        note: clipText(record.note, 260),
    };
}

function genericSummary(record: JsonRecord) {
    const result: JsonRecord = {};

    for (const [key, value] of Object.entries(record)) {
        if (key === "updated_at" || key === "created_at") continue;
        result[key] = typeof value === "string" ? clipText(value, 180) : value;
    }

    return result;
}

function sortTasksForAttention(records: JsonRecord[]) {
    const statusWeight = (status: unknown) => {
        if (status === "blocked") return 0;
        if (status === "in_progress") return 1;
        if (status === "open") return 2;
        if (status === "done") return 4;
        return 3;
    };

    return [...records].sort((left, right) => {
        const statusDifference = statusWeight(left.status) - statusWeight(right.status);
        if (statusDifference !== 0) return statusDifference;

        const leftDate = typeof left.due_date === "string" ? left.due_date : "9999-12-31";
        const rightDate = typeof right.due_date === "string" ? right.due_date : "9999-12-31";
        return leftDate.localeCompare(rightDate);
    });
}

function truncateArrays(value: unknown, limit: number): unknown {
    if (Array.isArray(value)) {
        return value.slice(0, limit).map((item) => truncateArrays(item, limit));
    }

    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, truncateArrays(nestedValue, limit)]),
        );
    }

    return value;
}

function enforceCharacterBudget(value: JsonRecord) {
    for (const arrayLimit of [24, 18, 12, 8, 5]) {
        const candidate = truncateArrays(value, arrayLimit) as JsonRecord;
        if (JSON.stringify(candidate).length <= MAX_CONTEXT_CHARACTERS) {
            return candidate;
        }
    }

    return {
        generated_at: value.generated_at,
        current_date: value.current_date,
        privacy_note: value.privacy_note,
        project: value.project,
        metrics: value.metrics,
        context_scope: value.context_scope,
        warning:
            "Detailed records were reduced because the selected project context exceeded the development provider token budget. Ask a narrower module-specific question for more detail.",
    };
}

export function selectProjectAssistantContext(fullContext: unknown, latestUserMessage: string) {
    const root = asRecord(fullContext);
    const roadmap = asRecord(root.roadmap);
    const documents = asRecord(root.documents);
    const budget = asRecord(root.budget);
    const property = asRecord(root.property);
    const normalizedMessage = normalizeSearchText(latestUserMessage);
    const terms = getSearchTerms(latestUserMessage);

    const intents = {
        progress: includesIntent(normalizedMessage, INTENT_KEYWORDS.progress),
        roadmap: includesIntent(normalizedMessage, INTENT_KEYWORDS.roadmap),
        calendar: includesIntent(normalizedMessage, INTENT_KEYWORDS.calendar),
        documents: includesIntent(normalizedMessage, INTENT_KEYWORDS.documents),
        expenses: includesIntent(normalizedMessage, INTENT_KEYWORDS.expenses),
        budget: includesIntent(normalizedMessage, INTENT_KEYWORDS.budget),
        property: includesIntent(normalizedMessage, INTENT_KEYWORDS.property),
    };

    const hasSpecificIntent = Object.values(intents).some(Boolean);
    if (!hasSpecificIntent) intents.progress = true;

    const stages = asArray(roadmap.stages);
    const tasks = asArray(roadmap.tasks);
    const overdueTasks = asArray(roadmap.overdue_tasks);
    const calendarItems = asArray(root.calendar);
    const expenseItems = asArray(root.expenses);
    const documentCategories = asArray(documents.categories);
    const documentItems = asArray(documents.items);
    const budgetMonths = asArray(budget.months);
    const ownerExpenses = asArray(budget.owner_expenses);
    const taxReserve = asArray(budget.tax_reserve);

    const openTasks = sortTasksForAttention(
        tasks.filter((task) => !["done", "dropped"].includes(String(task.status ?? ""))),
    );
    const recentlyDoneTasks = [...tasks]
        .filter((task) => task.status === "done")
        .sort((left, right) =>
            String(right.completed_at ?? right.updated_at ?? "").localeCompare(
                String(left.completed_at ?? left.updated_at ?? ""),
            ),
        );

    const selected: JsonRecord = {
        generated_at: root.generated_at ?? null,
        current_date: root.current_date ?? null,
        privacy_note: root.privacy_note ?? null,
        project: root.project ?? null,
        metrics: root.metrics ?? null,
        context_scope: {
            query: clipText(latestUserMessage, 500),
            intents,
            detail_is_query_focused: true,
            complete_metrics: true,
            note:
                "Metrics are complete. Detailed record arrays are query-focused and may be capped to stay within the development provider token limit.",
        },
    };

    if (intents.progress || intents.roadmap) {
        selected.roadmap = {
            stages: stages.map(stageSummary),
            attention_tasks: matchingRecords(openTasks, terms, 28).map(taskSummary),
            overdue_tasks: matchingRecords(overdueTasks, terms, 18).map(taskSummary),
            recently_completed_tasks: matchingRecords(recentlyDoneTasks, terms, 12).map(taskSummary),
        };
    }

    if (intents.progress || intents.calendar) {
        selected.calendar = matchingRecords(calendarItems, terms, intents.calendar ? 30 : 16).map(
            calendarSummary,
        );
    }

    if (intents.progress || intents.documents) {
        const pendingDocuments = documentItems.filter((document) =>
            ["watchlist", "trace_only", "pending", "missing", "deferred", "weak_evidence"].includes(
                String(document.status ?? ""),
            ),
        );
        const documentSource = intents.documents ? documentItems : pendingDocuments;

        selected.documents = {
            categories: documentCategories.map((category) => ({
                id: category.id ?? null,
                name: clipText(category.name, 140),
                description: clipText(category.description, 180),
            })),
            items: matchingRecords(documentSource, terms, intents.documents ? 32 : 16).map(
                documentSummary,
            ),
        };
    }

    if (intents.expenses) {
        selected.expenses = matchingRecords(expenseItems, terms, 36).map(expenseSummary);
    }

    if (intents.budget || intents.expenses) {
        selected.budget = {
            months: matchingRecords([...budgetMonths].reverse(), terms, 24).map(budgetMonthSummary),
            owner_expenses: matchingRecords(ownerExpenses, terms, 24).map(expenseSummary),
            tax_reserve: taxReserve.map(genericSummary),
        };
    }

    if (intents.property && Object.keys(property).length > 0) {
        selected.property = {
            profile: isRecord(property.profile) ? genericSummary(property.profile) : property.profile ?? null,
            acquisition_costs: matchingRecords(asArray(property.acquisition_costs), terms, 28).map(
                genericSummary,
            ),
            services: matchingRecords(asArray(property.services), terms, 18).map(genericSummary),
            contacts: matchingRecords(asArray(property.contacts), terms, 18).map(genericSummary),
        };
    }

    return enforceCharacterBudget(selected);
}
