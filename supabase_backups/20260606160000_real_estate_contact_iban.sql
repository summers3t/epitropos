-- Unit 19 Real Estate cockpit polish: add IBAN to people / contacts.
-- Safe to run more than once.

alter table public.managed_property_real_estate_contacts
    add column if not exists iban text;

comment on column public.managed_property_real_estate_contacts.iban is
    'Optional bank account / IBAN for tenant, property manager, previous owner or operational contact.';
