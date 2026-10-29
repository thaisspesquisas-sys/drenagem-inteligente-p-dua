create table public.field_inspections (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  flood_event_id uuid references public.flood_events(id), node_id uuid references public.drainage_nodes(id),
  inspected_at timestamptz not null default now(), team text, latitude double precision, longitude double precision,
  structure_condition text, obstruction_level text, findings text, recommendations text,
  photo_paths text[] not null default '{}', data_quality data_quality not null default 'confirmado_levantamento',
  deleted_at timestamptz, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.topo_surveys (
  id uuid primary key default gen_random_uuid(), name text not null, surveyed_at date, equipment text,
  vertical_datum text, crs text default 'SIRGAS 2000', responsible text, declared_accuracy text,
  points jsonb not null default '[]', notes text, data_quality data_quality not null default 'confirmado_levantamento',
  deleted_at timestamptz, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.basins (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  parent_id uuid references public.basins(id), area_km2 numeric, main_length_km numeric, delta_h_m numeric,
  runoff_c numeric, curve_number numeric, outlet_description text, source text,
  data_quality data_quality not null default 'pendente_validacao', notes text,
  deleted_at timestamptz, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.alternatives (
  id uuid primary key default gen_random_uuid(), name text not null, problem text, description text,
  est_cost_brl numeric, est_capacity_m3s numeric, implementation_months numeric,
  benefit_score int, risk_score int, status text not null default 'em_estudo', notes text,
  deleted_at timestamptz, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.alert_rules (
  id uuid primary key default gen_random_uuid(), name text not null,
  metric text not null, operator text not null default '>=', threshold numeric not null,
  level text not null default 'atencao', active boolean not null default true, notes text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.alert_events (
  id uuid primary key default gen_random_uuid(), rule_id uuid references public.alert_rules(id),
  rule_name text not null, metric text not null, value numeric not null, threshold numeric not null, level text not null,
  source text not null, triggered_at timestamptz not null default now(),
  acknowledged_by uuid, acknowledged_at timestamptz, created_by uuid default auth.uid()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), title text not null, report_type text not null,
  version int not null default 1, status text not null default 'rascunho',
  content jsonb not null, notes text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['field_inspections','topo_surveys','basins','alternatives','alert_rules','alert_events','reports'] loop
    execute format('grant select, insert, update on public.%I to authenticated; grant all on public.%I to service_role;', t, t);
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "role read" on public.%I for select to authenticated using (public.has_any_role(auth.uid()));', t);
    execute format('create policy "editor insert" on public.%I for insert to authenticated with check (public.can_edit(auth.uid()));', t);
    execute format('create policy "editor update" on public.%I for update to authenticated using (public.can_edit(auth.uid()));', t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_trigger();', t, t);
  end loop;
  foreach t in array array['field_inspections','topo_surveys','basins','alternatives','alert_rules','reports'] loop
    execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated();', t, t);
  end loop;
end $$;

-- alert events can be recorded by any role holder (viewers see forecasts too)
create policy "role insert alert events" on public.alert_events for insert to authenticated with check (public.has_any_role(auth.uid()));

-- versioning: content change bumps version and invalidates prior approvals
create or replace function public.version_report() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.content is distinct from old.content then
    new.version = old.version + 1;
    new.status = 'rascunho';
    update public.technical_reviews set decision = 'invalidada', comments = coalesce(comments,'') || ' [invalidada: relatório alterado para v' || new.version || ']'
      where target_table = 'reports' and target_id = new.id and decision in ('aprovado','pendente');
  end if;
  return new;
end $$;
create trigger version_reports before update on public.reports for each row execute function public.version_report();

-- private photos
create policy "role read photos" on storage.objects for select to authenticated using (bucket_id = 'fotos' and public.has_any_role(auth.uid()));
create policy "editor upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'fotos' and public.can_edit(auth.uid()));