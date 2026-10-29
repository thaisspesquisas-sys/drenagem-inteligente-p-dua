create type public.app_role as enum ('admin','engineer','technician','gis_analyst','viewer');
create type public.data_quality as enum ('confirmado_levantamento','fonte_oficial','estimado_modelo','informado_terceiro','pendente_validacao');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, crea text, organization text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, granted_by uuid, created_at timestamptz not null default now(),
  unique(user_id, role)
);
grant select, update on public.profiles to authenticated; grant all on public.profiles to service_role;
grant select, insert, delete on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.can_edit(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role in ('admin','engineer','technician','gis_analyst')) $$;
create or replace function public.has_any_role(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id) $$;

create policy "own or admin read profiles" on public.profiles for select to authenticated using (id=auth.uid() or public.has_any_role(auth.uid()));
create policy "own update profile" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "read own roles or admin" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin grants roles to others" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin') and user_id<>auth.uid());
create policy "admin revokes roles of others" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin') and user_id<>auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email);
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id,role) values (new.id,'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- audit
create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null, record_id text, action text not null,
  actor uuid, old_data jsonb, new_data jsonb, created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated; grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "admin/engineer read audit" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'engineer'));
create or replace function public.audit_trigger() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_logs(table_name,record_id,action,actor,old_data,new_data)
  values (TG_TABLE_NAME, coalesce((to_jsonb(new)->>'id'),(to_jsonb(old)->>'id')), TG_OP, auth.uid(),
    case when TG_OP<>'INSERT' then to_jsonb(old) end, case when TG_OP<>'DELETE' then to_jsonb(new) end);
  return coalesce(new,old);
end $$;
create or replace function public.touch_updated() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- domain tables
create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(), name text not null unique, source text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now()
);
create table public.flood_events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, address text, neighborhood text,
  latitude double precision, longitude double precision, srid int not null default 4674,
  coord_method text, occurred_at timestamptz,
  water_depth_m numeric, flooded_extent_m numeric, duration_min numeric,
  reported_frequency text, weather_conditions text, observed_rain_mm numeric,
  river_condition text, has_drainage_structures text, obstructions text,
  damages text, traffic_impact boolean default false,
  cause_hypothesis text, cause_confirmed boolean not null default false,
  needs_inspection boolean not null default true,
  diagnosis_status text not null default 'nao_vistoriado',
  data_quality data_quality not null default 'pendente_validacao',
  notes text, deleted_at timestamptz,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.drainage_nodes (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  node_type text not null, latitude double precision, longitude double precision, srid int not null default 4674,
  cover_elev_m numeric, invert_elev_m numeric, vertical_datum text, elev_method text,
  condition text, data_quality data_quality not null default 'pendente_validacao', source text,
  deleted_at timestamptz, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.drainage_links (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  link_type text not null default 'pipe',
  from_node uuid references public.drainage_nodes(id), to_node uuid references public.drainage_nodes(id),
  length_m numeric, length_method text, material text, diameter_mm numeric, shape text,
  upstream_invert_m numeric, downstream_invert_m numeric, vertical_datum text, elev_method text,
  manning_n numeric, condition text, operational_status text,
  data_quality data_quality not null default 'pendente_validacao', source text, inspected_at date,
  deleted_at timestamptz, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.data_sources (
  id uuid primary key default gen_random_uuid(), name text not null, institution text not null,
  url text, category text, published_at date, imported_at timestamptz,
  scale_resolution text, crs text, unit text, declared_accuracy text, license text,
  coverage text, limitations text, integration_status text not null default 'pendente',
  last_error text, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.calculation_runs (
  id uuid primary key default gen_random_uuid(), calc_type text not null, method_version text not null,
  inputs jsonb not null, outputs jsonb not null, link_id uuid references public.drainage_links(id),
  notes text, created_by uuid default auth.uid(), created_at timestamptz not null default now()
);
create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(), name text not null, objective text,
  engine text, engine_version text, status text not null default 'rascunho',
  boundary_conditions text, assumptions text, logs text, error_message text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.technical_reviews (
  id uuid primary key default gen_random_uuid(), target_table text not null, target_id uuid not null,
  target_version int not null default 1, decision text not null default 'pendente',
  comments text, reviewer uuid, reviewer_crea text, decided_at timestamptz,
  requested_by uuid default auth.uid(), created_at timestamptz not null default now()
);
create table public.weather_snapshots (
  id uuid primary key default gen_random_uuid(), source text not null, fetched_at timestamptz not null default now(),
  valid_until timestamptz not null, latitude double precision, longitude double precision, payload jsonb not null
);

do $$ declare t text; begin
  foreach t in array array['neighborhoods','flood_events','drainage_nodes','drainage_links','data_sources','calculation_runs','simulation_runs','technical_reviews'] loop
    execute format('grant select, insert, update on public.%I to authenticated; grant all on public.%I to service_role;', t, t);
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "role read" on public.%I for select to authenticated using (public.has_any_role(auth.uid()));', t);
    execute format('create policy "editor insert" on public.%I for insert to authenticated with check (public.can_edit(auth.uid()));', t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_trigger();', t, t);
  end loop;
end $$;
create policy "editor update" on public.neighborhoods for update to authenticated using (public.can_edit(auth.uid()));
create policy "editor update" on public.flood_events for update to authenticated using (public.can_edit(auth.uid()));
create policy "editor update" on public.drainage_nodes for update to authenticated using (public.can_edit(auth.uid()));
create policy "editor update" on public.drainage_links for update to authenticated using (public.can_edit(auth.uid()));
create policy "editor update" on public.data_sources for update to authenticated using (public.can_edit(auth.uid()));
create policy "editor update" on public.simulation_runs for update to authenticated using (public.can_edit(auth.uid()));
create policy "engineer decides" on public.technical_reviews for update to authenticated
  using (public.has_role(auth.uid(),'engineer') and requested_by<>auth.uid());
create trigger t1 before update on public.flood_events for each row execute function public.touch_updated();
create trigger t2 before update on public.drainage_nodes for each row execute function public.touch_updated();
create trigger t3 before update on public.drainage_links for each row execute function public.touch_updated();
create trigger t4 before update on public.data_sources for each row execute function public.touch_updated();
create trigger t5 before update on public.simulation_runs for each row execute function public.touch_updated();

-- a simulation can only be "concluida" if logs come from an engine
create or replace function public.guard_simulation() returns trigger language plpgsql as $$
begin
  if new.status in ('concluida','concluida_alertas') and (new.engine is null or new.logs is null) then
    raise exception 'Simulação só pode ser concluída com motor e logs reais de execução';
  end if;
  return new;
end $$;
create trigger guard_sim before insert or update on public.simulation_runs for each row execute function public.guard_simulation();

grant select on public.weather_snapshots to authenticated; grant all on public.weather_snapshots to service_role;
alter table public.weather_snapshots enable row level security;
create policy "role read weather" on public.weather_snapshots for select to authenticated using (public.has_any_role(auth.uid()));
create policy "role insert weather" on public.weather_snapshots for insert to authenticated with check (public.has_any_role(auth.uid()));

insert into public.data_sources(name,institution,url,category,integration_status,limitations) values
('Carta de suscetibilidade e estudos de inundação do Rio Pomba','SGB/CPRM','https://rigeo.sgb.gov.br/','Suscetibilidade','pendente','Importação manual de arquivos oficiais; sem API.'),
('Limites municipais e base cartográfica','IBGE','https://www.ibge.gov.br/geociencias/','Cartografia','pendente','Importação manual.'),
('TOPODATA — Modelo digital de elevação','INPE','https://www.dsr.inpe.br/topodata/','Relevo','pendente','Resolução ~30 m: apenas estimativa preliminar, não substitui levantamento.'),
('HidroWeb / SNIRH — estações hidrológicas','ANA','https://www.snirh.gov.br/hidroweb/','Hidrologia','pendente','Disponibilidade de API a verificar.'),
('Monitoramento hidrológico estadual','INEA-RJ','https://www.inea.rj.gov.br/','Hidrologia','pendente','Disponibilidade de API a verificar.'),
('Plano Municipal de Saneamento Básico','Prefeitura de Santo Antônio de Pádua','https://santoantoniodepadua.rj.gov.br/conteudo/18/plano_municipal_de_saneamento_basico','Documentos','pendente','Documento PDF; importação manual.'),
('Open-Meteo — previsão horária','Open-Meteo','https://open-meteo.com/','Meteorologia','ativa','Previsão de modelo numérico para ponto único; não representa todos os bairros.');