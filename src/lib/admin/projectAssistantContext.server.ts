import type { SupabaseClient } from "@supabase/supabase-js";

const UNIT_19_OWNER_EMAIL = "summers3t@gmail.com";
const NORTHSTAR_ALLOWED_EMAILS = new Set([
    "summers3t@gmail.com",
    "maria.brambashka@gmail.com",
]);

function compactText(value: unknown, maxLength = 2200) {
    if (typeof value !== "string") return value ?? null;

    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;

    return `${normalized.slice(0, maxLength)}…`;
}

function numberValue(value: unknown) {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
}

function isOpenTask(status: unknown) {
    return !["done", "dropped"].includes(String(status ?? ""));
}

function isPendingDocument(status: unknown) {
    return ["watchlist", "trace_only", "pending", "missing", "deferred", "weak_evidence"].includes(
        String(status ?? ""),
    );
}

function sanitizePropertyProfile(profile: Record<string, unknown> | null) {
    if (!profile) return null;

    return {
        kaek: profile.kaek ?? null,
        atak: profile.atak ?? null,
        pea_number: profile.pea_number ?? null,
        rental_contract_reference: profile.rental_contract_reference ?? null,
        size_sqm: profile.size_sqm ?? null,
        address_en: compactText(profile.address_en, 600),
        address_local: compactText(profile.address_local, 600),
        acquisition_date: profile.acquisition_date ?? null,
        purchase_price_eur: profile.purchase_price_eur ?? null,
        credit_amount_eur: profile.credit_amount_eur ?? null,
        self_participation_eur: profile.self_participation_eur ?? null,
        acquisition_notes: compactText(profile.acquisition_notes),
        has_tax_portal_username: Boolean(profile.tax_portal_username),
        has_password_vault_reference: Boolean(profile.tax_portal_password_ref),
        owner_afm_recorded: Boolean(profile.owner_afm),
        google_maps_url_recorded: Boolean(profile.google_maps_url),
        property_image_recorded: Boolean(profile.property_image_url),
    };
}

function sanitizeServiceAccount(row: Record<string, unknown>) {
    return {
        service_type: row.service_type,
        provider_name: compactText(row.provider_name, 500),
        start_date: row.start_date ?? null,
        account_holder: compactText(row.account_holder, 500),
        plan_name: compactText(row.plan_name, 500),
        monthly_fee_eur: row.monthly_fee_eur ?? null,
        website: compactText(row.website, 500),
        note: compactText(row.note),
        account_number_recorded: Boolean(row.account_number),
        meter_number_recorded: Boolean(row.meter_number),
        contract_number_recorded: Boolean(row.contract_number),
        customer_code_recorded: Boolean(row.customer_code),
        payment_code_recorded: Boolean(row.payment_code),
        delivery_point_recorded: Boolean(row.delivery_point),
        manager_contact_recorded: Boolean(row.manager_name || row.manager_phone || row.manager_email),
        manager_bank_account_recorded: Boolean(row.manager_bank_account),
    };
}

function sanitizeContact(row: Record<string, unknown>) {
    return {
        contact_type: row.contact_type,
        full_name: compactText(row.full_name, 500),
        note: compactText(row.note),
        afm_recorded: Boolean(row.afm),
        phone_recorded: Boolean(row.phone),
        email_recorded: Boolean(row.email),
        iban_recorded: Boolean(row.iban),
    };
}

function throwQueryError(label: string, error: { message?: string } | null) {
    if (!error) return;
    throw new Error(`${label}: ${error.message ?? "Unknown database error"}`);
}

export async function assertProjectAssistantAccess(
    supabase: SupabaseClient,
    userId: string,
    projectSlug: string,
) {
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, email")
        .eq("id", userId)
        .maybeSingle();

    throwQueryError("Failed to verify project assistant access", error);

    const email = String(profile?.email ?? "").toLowerCase();
    const role = String(profile?.role ?? "");

    if (projectSlug === "unit-19") {
        return role === "admin" && email === UNIT_19_OWNER_EMAIL;
    }

    if (projectSlug === "maria-northstar") {
        return NORTHSTAR_ALLOWED_EMAILS.has(email);
    }

    // Until the generic project membership model is introduced, new projects
    // remain admin-only in the assistant endpoint.
    return role === "admin";
}

export async function buildProjectAssistantContext(
    supabase: SupabaseClient,
    projectSlug: string,
) {
    const { data: project, error: projectError } = await supabase
        .from("managed_properties")
        .select(
            "id, slug, name, display_name, property_type, country, city, area, address, status, ownership_status, acquisition_date, notes, created_at, updated_at",
        )
        .eq("slug", projectSlug)
        .maybeSingle();

    throwQueryError("Failed to load project", projectError);

    if (!project) {
        throw new Error("Project not found or access denied");
    }

    const projectId = String(project.id);

    const [
        stagesResult,
        tasksResult,
        calendarResult,
        expensesResult,
        documentCategoriesResult,
        documentsResult,
        incomeMonthsResult,
        ownerExpensesResult,
        taxReserveResult,
        propertyProfileResult,
        realEstateCostsResult,
        servicesResult,
        contactsResult,
    ] = await Promise.all([
        supabase
            .from("managed_property_roadmap_stages")
            .select("id, stable_key, title, description, status, sort_order, created_at, updated_at")
            .eq("managed_property_id", projectId)
            .order("sort_order", { ascending: true })
            .limit(500),
        supabase
            .from("managed_property_tasks")
            .select(
                "id, stage_id, stable_key, title, note, status, priority, due_date, completed_at, sort_order, calendar_item_id, created_at, updated_at",
            )
            .eq("managed_property_id", projectId)
            .order("sort_order", { ascending: true })
            .limit(1000),
        supabase
            .from("managed_property_calendar_items")
            .select(
                "id, task_id, title, item_date, item_time, type, priority, status, location, note, linked_records, sort_order, created_at, updated_at",
            )
            .eq("managed_property_id", projectId)
            .order("item_date", { ascending: true })
            .order("item_time", { ascending: true, nullsFirst: true })
            .limit(1000),
        supabase
            .from("managed_property_expenses")
            .select(
                "id, title, category, issuer, note, amount_eur, amount_bgn, fx_rate, expense_date, status, source, sort_order, created_at, updated_at",
            )
            .eq("managed_property_id", projectId)
            .order("expense_date", { ascending: true, nullsFirst: false })
            .limit(1000),
        supabase
            .from("managed_property_document_categories")
            .select("id, stable_key, name, description, sort_order")
            .eq("managed_property_id", projectId)
            .order("sort_order", { ascending: true })
            .limit(500),
        supabase
            .from("managed_property_documents")
            .select(
                "id, category_id, title, file_name, source, proves, control_note, next_action, document_date, amount_eur, status, priority, tags, sort_order, created_at, updated_at, storage_path",
            )
            .eq("managed_property_id", projectId)
            .order("sort_order", { ascending: true })
            .limit(1000),
        supabase
            .from("managed_property_income_months")
            .select(
                "id, year, month, rent_expected_eur, rent_paid_eur, rent_paid_date, rent_status, electricity_confirmed, water_confirmed, gas_confirmed, building_fees_confirmed, note, created_at, updated_at",
            )
            .eq("managed_property_id", projectId)
            .order("year", { ascending: true })
            .order("month", { ascending: true })
            .limit(1000),
        supabase
            .from("managed_property_income_owner_expenses")
            .select("id, income_month_id, title, amount_eur, expense_date, note, created_at, updated_at")
            .eq("managed_property_id", projectId)
            .order("expense_date", { ascending: true, nullsFirst: false })
            .limit(1000),
        supabase
            .from("managed_property_tax_reserve")
            .select("id, year, tax_rate_percent, estimated_tax_eur, due_date, paid, paid_date, note, created_at, updated_at")
            .eq("managed_property_id", projectId)
            .order("year", { ascending: true })
            .limit(100),
        supabase
            .from("managed_property_real_estate_profiles")
            .select("*")
            .eq("managed_property_id", projectId)
            .maybeSingle(),
        supabase
            .from("managed_property_real_estate_costs")
            .select(
                "id, stable_key, label, local_label, category, amount_eur, rate_percent, vat_rate_percent, vat_included, include_in_total, expense_id, note, sort_order, created_at, updated_at",
            )
            .eq("managed_property_id", projectId)
            .order("sort_order", { ascending: true })
            .limit(500),
        supabase
            .from("managed_property_service_accounts")
            .select("*")
            .eq("managed_property_id", projectId)
            .order("sort_order", { ascending: true })
            .limit(500),
        supabase
            .from("managed_property_real_estate_contacts")
            .select("*")
            .eq("managed_property_id", projectId)
            .order("sort_order", { ascending: true })
            .limit(500),
    ]);

    throwQueryError("Failed to load roadmap stages", stagesResult.error);
    throwQueryError("Failed to load roadmap tasks", tasksResult.error);
    throwQueryError("Failed to load calendar", calendarResult.error);
    throwQueryError("Failed to load expenses", expensesResult.error);
    throwQueryError("Failed to load document categories", documentCategoriesResult.error);
    throwQueryError("Failed to load documents", documentsResult.error);
    throwQueryError("Failed to load budget months", incomeMonthsResult.error);
    throwQueryError("Failed to load owner expenses", ownerExpensesResult.error);
    throwQueryError("Failed to load tax reserve", taxReserveResult.error);
    throwQueryError("Failed to load property profile", propertyProfileResult.error);
    throwQueryError("Failed to load acquisition costs", realEstateCostsResult.error);
    throwQueryError("Failed to load service accounts", servicesResult.error);
    throwQueryError("Failed to load contacts", contactsResult.error);

    const today = new Date().toISOString().slice(0, 10);
    const stages = (stagesResult.data ?? []) as Array<Record<string, unknown>>;
    const tasks = (tasksResult.data ?? []) as Array<Record<string, unknown>>;
    const calendar = (calendarResult.data ?? []) as Array<Record<string, unknown>>;
    const expenses = (expensesResult.data ?? []) as Array<Record<string, unknown>>;
    const documents = (documentsResult.data ?? []) as Array<Record<string, unknown>>;
    const incomeMonths = (incomeMonthsResult.data ?? []) as Array<Record<string, unknown>>;
    const ownerExpenses = (ownerExpensesResult.data ?? []) as Array<Record<string, unknown>>;
    const realEstateCosts = (realEstateCostsResult.data ?? []) as Array<Record<string, unknown>>;

    const openTasks = tasks.filter((task) => isOpenTask(task.status));
    const overdueTasks = openTasks.filter((task) => typeof task.due_date === "string" && task.due_date < today);
    const upcomingCalendar = calendar.filter(
        (item) => String(item.status ?? "") !== "done" && typeof item.item_date === "string" && item.item_date >= today,
    );
    const pendingDocuments = documents.filter((document) => isPendingDocument(document.status));
    const doneTasks = tasks.filter((task) => task.status === "done");

    const totalExpenseEur = expenses
        .filter((expense) => expense.status !== "excluded")
        .reduce((sum, expense) => sum + numberValue(expense.amount_eur), 0);
    const paidExpenseEur = expenses
        .filter((expense) => expense.status === "paid")
        .reduce((sum, expense) => sum + numberValue(expense.amount_eur), 0);
    const rentExpectedEur = incomeMonths.reduce((sum, month) => sum + numberValue(month.rent_expected_eur), 0);
    const rentPaidEur = incomeMonths.reduce((sum, month) => sum + numberValue(month.rent_paid_eur), 0);
    const ownerExpenseEur = ownerExpenses.reduce((sum, expense) => sum + numberValue(expense.amount_eur), 0);

    const propertyType = String(project.property_type ?? "");
    const isPropertyProject = propertyType !== "personal_roadmap";

    return {
        generated_at: new Date().toISOString(),
        current_date: today,
        privacy_note:
            "Credentials, passwords, AFM values, IBANs, account numbers, meter numbers, payment codes, phone numbers and email addresses are not sent to the model. Only presence flags are included for sensitive fields.",
        project: {
            id: project.id,
            slug: project.slug,
            name: project.name,
            display_name: project.display_name,
            project_type: isPropertyProject ? "property" : "northstar",
            source_property_type: propertyType,
            country: project.country,
            city: project.city,
            area: project.area,
            address: compactText(project.address, 800),
            status: project.status,
            ownership_status: project.ownership_status,
            acquisition_date: project.acquisition_date,
            notes: compactText(project.notes),
            updated_at: project.updated_at,
            capabilities: [
                "roadmap",
                "calendar",
                "expenses",
                "documents",
                "budget",
                ...(isPropertyProject ? ["property"] : []),
                "tropo_read_only",
            ],
        },
        metrics: {
            stages_total: stages.length,
            stages_current: stages.filter((stage) => stage.status === "current").length,
            stages_completed: stages.filter((stage) => stage.status === "completed").length,
            tasks_total: tasks.length,
            tasks_done: doneTasks.length,
            tasks_open: openTasks.length,
            tasks_overdue: overdueTasks.length,
            tasks_blocked: tasks.filter((task) => task.status === "blocked").length,
            calendar_upcoming: upcomingCalendar.length,
            documents_total: documents.length,
            documents_pending_or_risky: pendingDocuments.length,
            expenses_total_eur: totalExpenseEur,
            expenses_paid_eur: paidExpenseEur,
            rent_expected_eur: rentExpectedEur,
            rent_paid_eur: rentPaidEur,
            owner_expenses_eur: ownerExpenseEur,
        },
        roadmap: {
            stages: stages.map((stage) => ({
                id: stage.id,
                stable_key: stage.stable_key,
                title: compactText(stage.title, 900),
                description: compactText(stage.description),
                status: stage.status,
                sort_order: stage.sort_order,
                updated_at: stage.updated_at,
            })),
            tasks: tasks.map((task) => ({
                id: task.id,
                stage_id: task.stage_id,
                stable_key: task.stable_key,
                title: compactText(task.title, 900),
                note: compactText(task.note),
                status: task.status,
                priority: task.priority,
                due_date: task.due_date,
                completed_at: task.completed_at,
                sort_order: task.sort_order,
                calendar_item_id: task.calendar_item_id,
                updated_at: task.updated_at,
            })),
            overdue_tasks: overdueTasks.map((task) => ({
                id: task.id,
                title: compactText(task.title, 900),
                priority: task.priority,
                due_date: task.due_date,
                status: task.status,
            })),
        },
        calendar: calendar.map((item) => ({
            id: item.id,
            task_id: item.task_id,
            title: compactText(item.title, 900),
            item_date: item.item_date,
            item_time: item.item_time,
            type: item.type,
            priority: item.priority,
            status: item.status,
            location: compactText(item.location, 700),
            note: compactText(item.note),
            linked_records: item.linked_records,
            updated_at: item.updated_at,
        })),
        expenses: expenses.map((expense) => ({
            id: expense.id,
            title: compactText(expense.title, 900),
            category: expense.category,
            issuer: compactText(expense.issuer, 700),
            note: compactText(expense.note),
            amount_eur: expense.amount_eur,
            amount_bgn: expense.amount_bgn,
            expense_date: expense.expense_date,
            status: expense.status,
            source: compactText(expense.source, 700),
            updated_at: expense.updated_at,
        })),
        documents: {
            categories: ((documentCategoriesResult.data ?? []) as Array<Record<string, unknown>>).map((category) => ({
                id: category.id,
                stable_key: category.stable_key,
                name: compactText(category.name, 700),
                description: compactText(category.description),
                sort_order: category.sort_order,
            })),
            items: documents.map((document) => ({
                id: document.id,
                category_id: document.category_id,
                title: compactText(document.title, 900),
                file_name: compactText(document.file_name, 700),
                source: compactText(document.source, 700),
                proves: compactText(document.proves),
                control_note: compactText(document.control_note),
                next_action: compactText(document.next_action),
                document_date: document.document_date,
                amount_eur: document.amount_eur,
                status: document.status,
                priority: document.priority,
                tags: document.tags,
                has_file: Boolean(document.storage_path),
                updated_at: document.updated_at,
            })),
        },
        budget: {
            months: incomeMonths.map((month) => ({
                id: month.id,
                year: month.year,
                month: month.month,
                rent_expected_eur: month.rent_expected_eur,
                rent_paid_eur: month.rent_paid_eur,
                rent_paid_date: month.rent_paid_date,
                rent_status: month.rent_status,
                electricity_confirmed: month.electricity_confirmed,
                water_confirmed: month.water_confirmed,
                gas_confirmed: month.gas_confirmed,
                building_fees_confirmed: month.building_fees_confirmed,
                note: compactText(month.note, 3000),
                updated_at: month.updated_at,
            })),
            owner_expenses: ownerExpenses.map((expense) => ({
                id: expense.id,
                income_month_id: expense.income_month_id,
                title: compactText(expense.title, 900),
                amount_eur: expense.amount_eur,
                expense_date: expense.expense_date,
                note: compactText(expense.note),
                updated_at: expense.updated_at,
            })),
            tax_reserve: ((taxReserveResult.data ?? []) as Array<Record<string, unknown>>).map((reserve) => ({
                id: reserve.id,
                year: reserve.year,
                tax_rate_percent: reserve.tax_rate_percent,
                estimated_tax_eur: reserve.estimated_tax_eur,
                due_date: reserve.due_date,
                paid: reserve.paid,
                paid_date: reserve.paid_date,
                note: compactText(reserve.note),
                updated_at: reserve.updated_at,
            })),
        },
        property: isPropertyProject
            ? {
                profile: sanitizePropertyProfile(
                    (propertyProfileResult.data ?? null) as Record<string, unknown> | null,
                ),
                acquisition_costs: realEstateCosts.map((cost) => ({
                    id: cost.id,
                    stable_key: cost.stable_key,
                    label: compactText(cost.label, 700),
                    local_label: compactText(cost.local_label, 700),
                    category: cost.category,
                    amount_eur: cost.amount_eur,
                    rate_percent: cost.rate_percent,
                    vat_rate_percent: cost.vat_rate_percent,
                    vat_included: cost.vat_included,
                    include_in_total: cost.include_in_total,
                    expense_id: cost.expense_id,
                    note: compactText(cost.note),
                    sort_order: cost.sort_order,
                    updated_at: cost.updated_at,
                })),
                services: ((servicesResult.data ?? []) as Array<Record<string, unknown>>).map(sanitizeServiceAccount),
                contacts: ((contactsResult.data ?? []) as Array<Record<string, unknown>>).map(sanitizeContact),
            }
            : null,
    };
}
