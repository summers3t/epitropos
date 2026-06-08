-- Unit 19 / Real Estate cockpit layout support fields.
-- Safe to run more than once.

alter table if exists public.managed_property_real_estate_profiles
    add column if not exists kaek text,
    add column if not exists google_maps_url text,
    add column if not exists property_image_url text,
    add column if not exists size_sqm numeric(10,2);

comment on column public.managed_property_real_estate_profiles.kaek is 'Greek cadastral property code / KAEK.';
comment on column public.managed_property_real_estate_profiles.google_maps_url is 'Operational Google Maps link for the property.';
comment on column public.managed_property_real_estate_profiles.property_image_url is 'Optional image URL used in the Real Estate cockpit overview.';
comment on column public.managed_property_real_estate_profiles.size_sqm is 'Operational property size used for price-per-square-meter calculations.';

-- Unit 19 seed correction for sqm only. Other values remain editable from the UI.
update public.managed_property_real_estate_profiles p
set size_sqm = coalesce(p.size_sqm, 55.00)
from public.managed_properties mp
where p.managed_property_id = mp.id
  and mp.slug = 'unit-19';
