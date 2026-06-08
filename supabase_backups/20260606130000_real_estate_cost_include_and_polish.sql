-- Real Estate cockpit polish support
-- Adds acquisition-total inclusion control for property costs.

alter table if exists public.managed_property_real_estate_costs
    add column if not exists include_in_total boolean not null default true;

-- Greek setup costs such as AFM setup may be useful in Property cockpit,
-- but should not automatically inflate the apartment acquisition total.
update public.managed_property_real_estate_costs c
set include_in_total = false
from public.managed_property_expenses e
where c.expense_id = e.id
  and e.category = 'greek_setup'
  and c.include_in_total = true;

-- Safety: pure financing anchor rows are informational, not transaction costs.
update public.managed_property_real_estate_costs
set include_in_total = false
where category = 'financing'
  and include_in_total = true;
