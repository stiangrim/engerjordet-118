-- Slå sammen budsjettpostene «Gipsvegger» og «Lettvegger m.m.» til én.

do $$
declare
  r record;
  gips_id uuid;
  lett_id uuid;
begin
  for r in
    select distinct project_id
    from public.budget_items
    where post in ('Gipsvegger', 'Lettvegger m.m.', 'Gips- og lettvegger')
  loop
    gips_id := null;
    lett_id := null;

    select id into gips_id
    from public.budget_items
    where project_id = r.project_id and post = 'Gipsvegger'
    limit 1;

    select id into lett_id
    from public.budget_items
    where project_id = r.project_id and post = 'Lettvegger m.m.'
    limit 1;

    if gips_id is not null and lett_id is not null then
      update public.receipts
      set budget_item_id = lett_id
      where budget_item_id = gips_id;

      update public.cost_entries
      set budget_item_id = lett_id
      where budget_item_id = gips_id;

      update public.budget_items l
      set
        post = 'Gips- og lettvegger',
        description = 'Gipsvegger. Lettvegger, isolasjon og stenderverk.',
        budget_materials = l.budget_materials + g.budget_materials,
        budget_labor = l.budget_labor + g.budget_labor,
        budget_total = l.budget_total + g.budget_total,
        budget_hours = nullif(
          coalesce(l.budget_hours, 0) + coalesce(g.budget_hours, 0),
          0
        ),
        hourly_rate = coalesce(l.hourly_rate, g.hourly_rate),
        sort_order = least(l.sort_order, g.sort_order)
      from public.budget_items g
      where l.id = lett_id and g.id = gips_id;

      delete from public.budget_items where id = gips_id;
    elsif gips_id is not null then
      update public.budget_items
      set
        post = 'Gips- og lettvegger',
        description = 'Gipsvegger. Lettvegger, isolasjon og stenderverk.'
      where id = gips_id;
    elsif lett_id is not null then
      update public.budget_items
      set
        post = 'Gips- og lettvegger',
        description = 'Gipsvegger. Lettvegger, isolasjon og stenderverk.'
      where id = lett_id;
    end if;
  end loop;
end $$;
