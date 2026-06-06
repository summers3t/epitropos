-- Managed Property Real Estate cockpit
-- Adds a structured property/utility/contact layer for Unit 19-style owned assets.

create table if not exists public.managed_property_real_estate_profiles (
    id uuid primary key default gen_random_uuid(),
    managed_property_id uuid not null unique references public.managed_properties(id) on delete cascade,
    owner_afm text null,
    tax_portal_username text null,
    tax_portal_password_ref text null,
    atak text null,
    pea_number text null,
    rental_contract_reference text null,
    address_en text null,
    address_local text null,
    acquisition_date date null,
    purchase_price_eur numeric(12,2) null,
    credit_amount_eur numeric(12,2) null,
    self_participation_eur numeric(12,2) null,
    acquisition_notes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.managed_property_real_estate_costs (
    id uuid primary key default gen_random_uuid(),
    managed_property_id uuid not null references public.managed_properties(id) on delete cascade,
    stable_key text not null,
    label text not null,
    local_label text null,
    category text not null default 'transaction',
    amount_eur numeric(12,2) not null default 0,
    rate_percent numeric(8,4) null,
    vat_rate_percent numeric(8,4) null,
    vat_included boolean not null default true,
    expense_id uuid null references public.managed_property_expenses(id) on delete set null,
    note text null,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint managed_property_real_estate_costs_unique_key unique (managed_property_id, stable_key),
    constraint managed_property_real_estate_costs_category_check check (category = any (array['price','tax','broker','legal','notary','registry','cadastre','financing','other']::text[]))
);

create table if not exists public.managed_property_service_accounts (
    id uuid primary key default gen_random_uuid(),
    managed_property_id uuid not null references public.managed_properties(id) on delete cascade,
    service_type text not null,
    provider_name text null,
    start_date date null,
    account_holder text null,
    account_number text null,
    meter_number text null,
    contract_number text null,
    customer_code text null,
    payment_code text null,
    delivery_point text null,
    plan_name text null,
    monthly_fee_eur numeric(10,2) null,
    manager_name text null,
    manager_phone text null,
    manager_email text null,
    manager_bank_account text null,
    phone text null,
    website text null,
    note text null,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint managed_property_service_accounts_unique_type unique (managed_property_id, service_type),
    constraint managed_property_service_accounts_type_check check (service_type = any (array['electricity','water','gas','internet_tv','building_fees','other']::text[]))
);

create table if not exists public.managed_property_real_estate_contacts (
    id uuid primary key default gen_random_uuid(),
    managed_property_id uuid not null references public.managed_properties(id) on delete cascade,
    contact_type text not null,
    full_name text not null default '',
    afm text null,
    phone text null,
    email text null,
    note text null,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint managed_property_real_estate_contacts_type_check check (contact_type = any (array['tenant','previous_owner','property_manager','other']::text[]))
);

create index if not exists managed_property_real_estate_costs_property_idx on public.managed_property_real_estate_costs(managed_property_id, sort_order);
create index if not exists managed_property_service_accounts_property_idx on public.managed_property_service_accounts(managed_property_id, sort_order);
create index if not exists managed_property_real_estate_contacts_property_idx on public.managed_property_real_estate_contacts(managed_property_id, contact_type, sort_order);
create unique index if not exists managed_property_real_estate_contacts_unique_name_idx on public.managed_property_real_estate_contacts(managed_property_id, contact_type, full_name);

drop trigger if exists set_updated_at_managed_property_real_estate_profiles on public.managed_property_real_estate_profiles;

create trigger set_updated_at_managed_property_real_estate_profiles
before update on public.managed_property_real_estate_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_managed_property_real_estate_costs on public.managed_property_real_estate_costs;

create trigger set_updated_at_managed_property_real_estate_costs
before update on public.managed_property_real_estate_costs
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_managed_property_service_accounts on public.managed_property_service_accounts;

create trigger set_updated_at_managed_property_service_accounts
before update on public.managed_property_service_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_managed_property_real_estate_contacts on public.managed_property_real_estate_contacts;

create trigger set_updated_at_managed_property_real_estate_contacts
before update on public.managed_property_real_estate_contacts
for each row execute function public.set_updated_at();

alter table public.managed_property_real_estate_profiles enable row level security;
alter table public.managed_property_real_estate_costs enable row level security;
alter table public.managed_property_service_accounts enable row level security;
alter table public.managed_property_real_estate_contacts enable row level security;

drop policy if exists "Managed real estate profiles access by project email" on public.managed_property_real_estate_profiles;

create policy "Managed real estate profiles access by project email"
on public.managed_property_real_estate_profiles
for all to authenticated
using (can_access_managed_property(managed_property_id))
with check (can_access_managed_property(managed_property_id));

drop policy if exists "Managed real estate costs access by project email" on public.managed_property_real_estate_costs;

create policy "Managed real estate costs access by project email"
on public.managed_property_real_estate_costs
for all to authenticated
using (can_access_managed_property(managed_property_id))
with check (can_access_managed_property(managed_property_id));

drop policy if exists "Managed service accounts access by project email" on public.managed_property_service_accounts;

create policy "Managed service accounts access by project email"
on public.managed_property_service_accounts
for all to authenticated
using (can_access_managed_property(managed_property_id))
with check (can_access_managed_property(managed_property_id));

drop policy if exists "Managed real estate contacts access by project email" on public.managed_property_real_estate_contacts;

create policy "Managed real estate contacts access by project email"
on public.managed_property_real_estate_contacts
for all to authenticated
using (can_access_managed_property(managed_property_id))
with check (can_access_managed_property(managed_property_id));

-- Seed Unit 19 profile and default linked rows. Values are intentionally editable in the UI.
insert into public.managed_property_real_estate_profiles (
    managed_property_id,
    address_en,
    address_local,
    acquisition_date,
    purchase_price_eur,
    acquisition_notes
)
select
    mp.id,
    coalesce(mp.address, 'Dimitriou Mitropoulou 14, Thessaloniki'),
    'Δημητρίου Μητροπούλου 14, Θεσσαλονίκη',
    mp.acquisition_date,
    90000,
    'Seeded from Unit 19 workspace. Add AFM, ATAK, PEA and utility account details after verification.'
from public.managed_properties mp
where mp.slug = 'unit-19'
on conflict (managed_property_id) do nothing;

with unit19 as (
    select id from public.managed_properties where slug = 'unit-19'
), expense_match as (
    select
        e.managed_property_id,
        (array_agg(e.id order by e.created_at desc) filter (where e.title ilike '%Данък придобиване%' or e.title ilike '%3.09%'))[1] as transfer_tax_expense_id,
        (array_agg(e.id order by e.created_at desc) filter (where e.title ilike '%Broker%' or e.title ilike '%брокер%'))[1] as broker_fee_expense_id,
        (array_agg(e.id order by e.created_at desc) filter (where e.title ilike '%Нотариални такси%' or e.title ilike '%notary%'))[1] as notary_fee_expense_id,
        (array_agg(e.id order by e.created_at desc) filter (where e.title ilike '%кадастър%' or e.title ilike '%cadastre%'))[1] as cadastre_fee_expense_id,
        (array_agg(e.id order by e.created_at desc) filter (where e.title ilike '%E9%' or e.title ilike '%е9%'))[1] as e9_fee_expense_id
    from public.managed_property_expenses e
    join unit19 u on u.id = e.managed_property_id
    group by e.managed_property_id
), seed_costs as (
    select u.id as managed_property_id, *
    from unit19 u
    cross join (values
        ('purchase_price', 'Purchase price', 'Τίμημα αγοράς', 'price', 90000::numeric, null::numeric, null::numeric, true, null::uuid, 'Contract price / not an expense row.', 10),
        ('transfer_tax', 'Transfer tax', 'Φόρος μεταβίβασης', 'tax', 2781::numeric, 3.09::numeric, null::numeric, true, (select transfer_tax_expense_id from expense_match), 'Greek transfer tax. Default 3.09% for this acquisition.', 20),
        ('broker_fee', 'Broker fee', 'Μεσιτική αμοιβή', 'broker', 1800::numeric, 2::numeric, 24::numeric, false, (select broker_fee_expense_id from expense_match), 'Broker fee; VAT handling depends on invoice.', 30),
        ('lawyer_fee', 'Lawyer fees', 'Δικηγορική αμοιβή', 'legal', 0::numeric, null::numeric, 24::numeric, true, null::uuid, 'Add if invoiced separately.', 40),
        ('notary_registry', 'Notary + initial registration', 'Συμβολαιογράφος + αρχική μεταγραφή', 'notary', 1140::numeric, null::numeric, null::numeric, true, (select notary_fee_expense_id from expense_match), 'Linked to existing notary/registration expense where available.', 50),
        ('cadastre_registration', 'Cadastre registration', 'Κτηματολόγιο', 'cadastre', 450::numeric, 0.5::numeric, null::numeric, true, (select cadastre_fee_expense_id from expense_match), 'Initial cadastral registration.', 60),
        ('e9_fee', 'E9 / tax registration fee', 'E9 / φορολογική καταχώριση', 'tax', 254::numeric, null::numeric, null::numeric, true, (select e9_fee_expense_id from expense_match), 'E9 / registration administrative row.', 70),
        ('credit_amount', 'Credit / loan amount', 'Δάνειο / χρηματοδότηση', 'financing', 71680.65::numeric, null::numeric, null::numeric, true, null::uuid, 'Financing anchor. Not an acquisition expense.', 80),
        ('self_participation', 'Self participation', 'Ίδια συμμετοχή', 'financing', 0::numeric, null::numeric, null::numeric, true, null::uuid, 'Own funds / participation. Fill manually.', 90)
    ) as v(stable_key, label, local_label, category, amount_eur, rate_percent, vat_rate_percent, vat_included, expense_id, note, sort_order)
)
insert into public.managed_property_real_estate_costs (
    managed_property_id, stable_key, label, local_label, category, amount_eur, rate_percent, vat_rate_percent, vat_included, expense_id, note, sort_order
)
select managed_property_id, stable_key, label, local_label, category, amount_eur, rate_percent, vat_rate_percent, vat_included, expense_id, note, sort_order
from seed_costs
on conflict (managed_property_id, stable_key) do nothing;

with unit19 as (select id from public.managed_properties where slug = 'unit-19')
insert into public.managed_property_service_accounts (
    managed_property_id, service_type, provider_name, start_date, account_holder, account_number, meter_number, contract_number, customer_code, payment_code, delivery_point, plan_name, monthly_fee_eur, manager_name, manager_phone, manager_email, manager_bank_account, phone, website, note, sort_order
)
select u.id, v.*
from unit19 u
cross join (values
    ('electricity', 'Electricity provider', null::date, '', 'Αριθμός παροχής', 'Αριθμός Μετρητή', 'Λογαριασμός συμβολαίου', null, null, null, null, null::numeric, null, null, null, null, null, null, 'Greek labels: Ονοματεπώνυμο συμβαλλομένου, Αριθμός παροχής, Αριθμός Μετρητή, Λογαριασμός συμβολαίου.', 10),
    ('water', 'EYATH / Water provider', null::date, '', 'Αριθμός παροχής', 'Αριθμός υδρομέτρου', null, null, null, null, null, null::numeric, null, null, null, null, null, null, 'Greek labels: Ονοματεπώνυμο συμβαλλομένου, Αριθμός παροχής, Αριθμός υδρομέτρου.', 20),
    ('gas', 'Gas provider', null::date, '', null, 'Αριθμός Μετρητή', null, 'Κωδικός πελάτη', 'Ηλεκτρονικός κωδικός πληρωμής', 'HKASP / Σημείο παράδοσης', null, null::numeric, null, null, null, null, null, null, 'Greek labels: Κωδικός πελάτη, Ηλεκτρονικός κωδικός πληρωμής, Αριθμός Μετρητή, HKASP.', 30),
    ('internet_tv', 'Internet / TV provider', null::date, '', null, null, null, null, null, null, 'Subscription plan', null::numeric, null, null, null, null, null, null, 'Internet / TV account details.', 40),
    ('building_fees', 'Building fees / elevator', null::date, null, null, null, null, null, null, null, null, null::numeric, 'Building manager', null, null, null, null, null, 'Κοινόχρηστα / ασανσέρ: monthly fee, manager contact and bank account.', 50)
) as v(service_type, provider_name, start_date, account_holder, account_number, meter_number, contract_number, customer_code, payment_code, delivery_point, plan_name, monthly_fee_eur, manager_name, manager_phone, manager_email, manager_bank_account, phone, website, note, sort_order)
on conflict (managed_property_id, service_type) do nothing;

with unit19 as (select id from public.managed_properties where slug = 'unit-19')
insert into public.managed_property_real_estate_contacts (
    managed_property_id, contact_type, full_name, afm, phone, email, note, sort_order
)
select u.id, v.*
from unit19 u
cross join (values
    ('tenant', 'Νικολέτα Καλαμπόκα', null, null, null, 'Tenant contact. Use Greek, informal address: Νικολέτα.', 10),
    ('tenant', 'Georgios', null, null, null, 'Occupant / tenant son. Use English.', 20),
    ('previous_owner', 'Previous owner 1', null, null, null, 'Fill verified seller data from deed if needed.', 30),
    ('previous_owner', 'Previous owner 2', null, null, null, 'Fill verified seller data from deed if needed.', 40)
) as v(contact_type, full_name, afm, phone, email, note, sort_order)
on conflict (managed_property_id, contact_type, full_name) do nothing;
