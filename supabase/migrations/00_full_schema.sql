-- ==============================================================================
-- CF Leads — Schema Completo Consolidado (Tabelas, RLS, Funções e Seeds)
-- Execute este script no SQL Editor do Supabase Cloud (cfleads)
-- ==============================================================================

-- 1. Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Tipos e Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'gestor', 'vendedor');
  end if;
  if not exists (select 1 from pg_type where typname = 'company_source') then
    create type company_source as enum ('manual', 'google_maps');
  end if;
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum (
      'novo', 'no_lote', 'retorno_agendado', 'oportunidade',
      'descartado', 'encerrado_temporario', 'encerrado_definitivo'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'next_action_type') then
    create type next_action_type as enum ('ligar', 'email', 'whatsapp', 'reuniao', 'nenhuma');
  end if;
  if not exists (select 1 from pg_type where typname = 'weekly_batch_status') then
    create type weekly_batch_status as enum ('aberto', 'em_revisao', 'fechado');
  end if;
  if not exists (select 1 from pg_type where typname = 'batch_item_destination') then
    create type batch_item_destination as enum (
      'oportunidade', 'retorno_agendado', 'encerrado_temporario',
      'encerrado_definitivo', 'descartado'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'channel_type') then
    create type channel_type as enum ('ligacao', 'email', 'whatsapp', 'sms', 'reuniao');
  end if;
  if not exists (select 1 from pg_type where typname = 'attempt_outcome') then
    create type attempt_outcome as enum (
      'nao_atendeu', 'caixa_postal', 'numero_invalido',
      'secretaria_barrou', 'decisor_interesse', 'decisor_sem_interesse',
      'decisor_sem_decisao', 'pediu_material', 'autorizou_whatsapp',
      'enviado', 'respondeu', 'opt_out'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'dedup_kind') then
    create type dedup_kind as enum ('phone', 'cnpj', 'domain', 'place_id');
  end if;
  if not exists (select 1 from pg_type where typname = 'search_job_status') then
    create type search_job_status as enum ('rodando', 'concluido', 'erro');
  end if;
end $$;

-- 3. Função e Trigger para updated_at automático
create or replace function set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- 4. Tabelas

-- 4.1 Organizações
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_organizations_updated_at on organizations;
create trigger tr_organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- 4.2 Perfis de Usuário
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'vendedor',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_profiles_updated_at on profiles;
create trigger tr_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- 4.3 Configurações por Organização
create table if not exists settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  batch_size int not null default 30,
  max_attempts_week int not null default 5,
  reentry_days int not null default 60,
  default_return_days int not null default 7,
  max_reschedules int not null default 3,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_settings_updated_at on settings;
create trigger tr_settings_updated_at
  before update on settings
  for each row execute function set_updated_at();

-- 4.4 Empresas
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  cnpj text,
  phone_e164 text,
  phone_alt_e164 text,
  phone_invalid boolean not null default false,
  email text,
  website text,
  instagram text,
  address text,
  city text,
  state text,
  niche text,
  source company_source not null default 'manual',
  google_place_id text,
  google_rating numeric(3,2),
  google_reviews int,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_companies_updated_at on companies;
create trigger tr_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- 4.5 Contatos
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  role_title text,
  is_decision_maker boolean not null default false,
  phone_e164 text,
  email text,
  best_time_notes text,
  whatsapp_optin_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_contacts_updated_at on contacts;
create trigger tr_contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();

-- 4.6 Leads
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  company_id uuid not null unique references companies(id) on delete cascade,
  owner_id uuid references profiles(id) on delete set null,
  status lead_status not null default 'novo',
  cycle int not null default 1,
  reentry_at date,
  scheduled_return_at timestamptz,
  reschedule_count int not null default 0,
  next_action next_action_type not null default 'nenhuma',
  next_action_at timestamptz,
  discard_reason text,
  last_decision_maker_contact_at timestamptz,
  opt_out_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_leads_updated_at on leads;
create trigger tr_leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- 4.7 Lotes Semanais
create table if not exists weekly_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  status weekly_batch_status not null default 'aberto',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(owner_id, week_start)
);
drop trigger if exists tr_weekly_batches_updated_at on weekly_batches;
create trigger tr_weekly_batches_updated_at
  before update on weekly_batches
  for each row execute function set_updated_at();

-- 4.8 Itens do Lote
create table if not exists batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references weekly_batches(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  destination batch_item_destination,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(batch_id, lead_id)
);
drop trigger if exists tr_batch_items_updated_at on batch_items;
create trigger tr_batch_items_updated_at
  before update on batch_items
  for each row execute function set_updated_at();

-- 4.9 Tentativas de Contato
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  batch_id uuid references weekly_batches(id) on delete set null,
  channel channel_type not null,
  outcome attempt_outcome not null,
  reached_decision_maker boolean not null default false,
  occurred_at timestamptz not null default timezone('utc'::text, now()),
  duration_seconds int,
  notes text,
  suggested_action text,
  suggested_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_attempts_updated_at on attempts;
create trigger tr_attempts_updated_at
  before update on attempts
  for each row execute function set_updated_at();

-- 4.10 Regras de Próxima Ação
create table if not exists outcome_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  channel channel_type not null,
  outcome attempt_outcome not null,
  occurrence int,
  action next_action_type not null,
  delay_days int not null default 0,
  delay_hours int not null default 0,
  switch_period boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_outcome_rules_updated_at on outcome_rules;
create trigger tr_outcome_rules_updated_at
  before update on outcome_rules
  for each row execute function set_updated_at();

-- 4.11 Modelos de Mensagem
create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  channel channel_type not null,
  name text not null,
  subject text,
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_message_templates_updated_at on message_templates;
create trigger tr_message_templates_updated_at
  before update on message_templates
  for each row execute function set_updated_at();

-- 4.12 Lista de Bloqueio de Duplicatas (Hashes HMAC-SHA256)
create table if not exists dedup_blocklist (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  kind dedup_kind not null,
  value_hash text not null,
  reason text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(organization_id, kind, value_hash)
);

-- 4.13 Jobs de Busca (Apify)
create table if not exists search_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  niche text not null,
  city text not null,
  filters jsonb not null default '{}'::jsonb,
  apify_run_id text,
  status search_job_status not null default 'rodando',
  results jsonb,
  results_count int not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
drop trigger if exists tr_search_jobs_updated_at on search_jobs;
create trigger tr_search_jobs_updated_at
  before update on search_jobs
  for each row execute function set_updated_at();

-- 4.14 Trilha de Auditoria (Audit Log — Somente INSERT)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 5. Índices de Performance
create index if not exists idx_leads_org_status on leads(organization_id, status);
create index if not exists idx_leads_next_action_at on leads(next_action_at);
create index if not exists idx_companies_phone_e164 on companies(organization_id, phone_e164);
create index if not exists idx_companies_place_id on companies(organization_id, google_place_id);
create index if not exists idx_attempts_lead_occurred on attempts(lead_id, occurred_at desc);
create index if not exists idx_batch_items_batch on batch_items(batch_id);
create index if not exists idx_contacts_company on contacts(company_id);
create index if not exists idx_dedup_hash on dedup_blocklist(organization_id, kind, value_hash);
create index if not exists idx_audit_log_org on audit_log(organization_id, created_at desc);

-- 6. Funções Auxiliares RLS
create or replace function public.auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and active = true limit 1;
$$;

-- 7. Habilitação de RLS em todas as tabelas
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table settings enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table leads enable row level security;
alter table weekly_batches enable row level security;
alter table batch_items enable row level security;
alter table attempts enable row level security;
alter table outcome_rules enable row level security;
alter table message_templates enable row level security;
alter table dedup_blocklist enable row level security;
alter table search_jobs enable row level security;
alter table audit_log enable row level security;

-- 8. Políticas de Segurança (RLS)
drop policy if exists "organizations_select" on organizations;
create policy "organizations_select" on organizations
  for select using (id = public.auth_org_id());

drop policy if exists "organizations_update" on organizations;
create policy "organizations_update" on organizations
  for update using (id = public.auth_org_id() and public.auth_role() = 'admin');

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (organization_id = public.auth_org_id());

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles
  for insert with check (id = auth.uid() or public.auth_role() in ('admin', 'gestor'));

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles
  for update using (id = auth.uid() or public.auth_role() in ('admin', 'gestor'));

drop policy if exists "settings_select" on settings;
create policy "settings_select" on settings
  for select using (organization_id = public.auth_org_id());

drop policy if exists "settings_update" on settings;
create policy "settings_update" on settings
  for update using (organization_id = public.auth_org_id() and public.auth_role() in ('admin', 'gestor'));

drop policy if exists "companies_select" on companies;
create policy "companies_select" on companies
  for select using (organization_id = public.auth_org_id());

drop policy if exists "companies_insert" on companies;
create policy "companies_insert" on companies
  for insert with check (organization_id = public.auth_org_id());

drop policy if exists "companies_update" on companies;
create policy "companies_update" on companies
  for update using (organization_id = public.auth_org_id());

drop policy if exists "companies_delete" on companies;
create policy "companies_delete" on companies
  for delete using (organization_id = public.auth_org_id() and public.auth_role() = 'admin');

drop policy if exists "contacts_select" on contacts;
create policy "contacts_select" on contacts
  for select using (organization_id = public.auth_org_id());

drop policy if exists "contacts_insert" on contacts;
create policy "contacts_insert" on contacts
  for insert with check (organization_id = public.auth_org_id());

drop policy if exists "contacts_update" on contacts;
create policy "contacts_update" on contacts
  for update using (organization_id = public.auth_org_id());

drop policy if exists "contacts_delete" on contacts;
create policy "contacts_delete" on contacts
  for delete using (organization_id = public.auth_org_id() and public.auth_role() = 'admin');

drop policy if exists "leads_select" on leads;
create policy "leads_select" on leads
  for select using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid() or
      owner_id is null
    )
  );

drop policy if exists "leads_insert" on leads;
create policy "leads_insert" on leads
  for insert with check (organization_id = public.auth_org_id());

drop policy if exists "leads_update" on leads;
create policy "leads_update" on leads
  for update using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid()
    )
  );

drop policy if exists "leads_delete" on leads;
create policy "leads_delete" on leads
  for delete using (organization_id = public.auth_org_id() and public.auth_role() = 'admin');

drop policy if exists "weekly_batches_select" on weekly_batches;
create policy "weekly_batches_select" on weekly_batches
  for select using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid()
    )
  );

drop policy if exists "weekly_batches_insert" on weekly_batches;
create policy "weekly_batches_insert" on weekly_batches
  for insert with check (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid()
    )
  );

drop policy if exists "weekly_batches_update" on weekly_batches;
create policy "weekly_batches_update" on weekly_batches
  for update using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid()
    )
  );

drop policy if exists "batch_items_select" on batch_items;
create policy "batch_items_select" on batch_items
  for select using (
    exists (
      select 1 from weekly_batches wb
      where wb.id = batch_items.batch_id
        and wb.organization_id = public.auth_org_id()
        and (public.auth_role() in ('admin', 'gestor') or wb.owner_id = auth.uid())
    )
  );

drop policy if exists "batch_items_insert" on batch_items;
create policy "batch_items_insert" on batch_items
  for insert with check (
    exists (
      select 1 from weekly_batches wb
      where wb.id = batch_items.batch_id
        and wb.organization_id = public.auth_org_id()
        and (public.auth_role() in ('admin', 'gestor') or wb.owner_id = auth.uid())
    )
  );

drop policy if exists "batch_items_update" on batch_items;
create policy "batch_items_update" on batch_items
  for update using (
    exists (
      select 1 from weekly_batches wb
      where wb.id = batch_items.batch_id
        and wb.organization_id = public.auth_org_id()
        and (public.auth_role() in ('admin', 'gestor') or wb.owner_id = auth.uid())
    )
  );

drop policy if exists "attempts_select" on attempts;
create policy "attempts_select" on attempts
  for select using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      user_id = auth.uid()
    )
  );

drop policy if exists "attempts_insert" on attempts;
create policy "attempts_insert" on attempts
  for insert with check (organization_id = public.auth_org_id() and user_id = auth.uid());

drop policy if exists "outcome_rules_select" on outcome_rules;
create policy "outcome_rules_select" on outcome_rules
  for select using (organization_id = public.auth_org_id());

drop policy if exists "outcome_rules_manage" on outcome_rules;
create policy "outcome_rules_manage" on outcome_rules
  for all using (
    organization_id = public.auth_org_id() and public.auth_role() in ('admin', 'gestor')
  );

drop policy if exists "message_templates_select" on message_templates;
create policy "message_templates_select" on message_templates
  for select using (organization_id = public.auth_org_id());

drop policy if exists "message_templates_manage" on message_templates;
create policy "message_templates_manage" on message_templates
  for all using (
    organization_id = public.auth_org_id() and public.auth_role() in ('admin', 'gestor')
  );

drop policy if exists "dedup_blocklist_select" on dedup_blocklist;
create policy "dedup_blocklist_select" on dedup_blocklist
  for select using (organization_id = public.auth_org_id());

drop policy if exists "dedup_blocklist_insert" on dedup_blocklist;
create policy "dedup_blocklist_insert" on dedup_blocklist
  for insert with check (organization_id = public.auth_org_id());

drop policy if exists "search_jobs_select" on search_jobs;
create policy "search_jobs_select" on search_jobs
  for select using (organization_id = public.auth_org_id());

drop policy if exists "search_jobs_insert" on search_jobs;
create policy "search_jobs_insert" on search_jobs
  for insert with check (organization_id = public.auth_org_id() and user_id = auth.uid());

drop policy if exists "search_jobs_update" on search_jobs;
create policy "search_jobs_update" on search_jobs
  for update using (organization_id = public.auth_org_id());

drop policy if exists "audit_log_insert" on audit_log;
create policy "audit_log_insert" on audit_log
  for insert with check (organization_id = public.auth_org_id());

drop policy if exists "audit_log_select" on audit_log;
create policy "audit_log_select" on audit_log
  for select using (organization_id = public.auth_org_id() and public.auth_role() = 'admin');

-- 9. Funções de LGPD, Deduplicação e Reentrada
create or replace function public.hash_dedup_value(
  p_value text,
  p_pepper text
)
returns text
language plpgsql
immutable
security definer
set search_path = 'extensions', 'public'
as $$
begin
  if p_value is null or trim(p_value) = '' then
    return null;
  end if;
  return encode(hmac(lower(trim(p_value))::bytea, p_pepper::bytea, 'sha256'), 'hex');
end;
$$;

create or replace function public.close_lead_permanently(
  p_lead_id uuid,
  p_pepper text
)
returns void
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare
  v_org_id uuid;
  v_company_id uuid;
  v_phone text;
  v_cnpj text;
  v_website text;
  v_domain text;
  v_place_id text;
  v_hash text;
begin
  select l.organization_id, l.company_id, c.phone_e164, c.cnpj, c.website, c.google_place_id
  into v_org_id, v_company_id, v_phone, v_cnpj, v_website, v_place_id
  from leads l
  join companies c on c.id = l.company_id
  where l.id = p_lead_id;

  if not found then
    raise exception 'Lead não encontrado.';
  end if;

  if v_phone is not null and trim(v_phone) <> '' then
    v_hash := hash_dedup_value(v_phone, p_pepper);
    insert into dedup_blocklist (organization_id, kind, value_hash, reason)
    values (v_org_id, 'phone', v_hash, 'Encerramento definitivo')
    on conflict (organization_id, kind, value_hash) do nothing;
  end if;

  if v_cnpj is not null and trim(v_cnpj) <> '' then
    v_hash := hash_dedup_value(regexp_replace(v_cnpj, '\D', '', 'g'), p_pepper);
    insert into dedup_blocklist (organization_id, kind, value_hash, reason)
    values (v_org_id, 'cnpj', v_hash, 'Encerramento definitivo')
    on conflict (organization_id, kind, value_hash) do nothing;
  end if;

  if v_website is not null and trim(v_website) <> '' then
    v_domain := lower(regexp_replace(regexp_replace(v_website, '^https?://(www\.)?', ''), '/.*$', ''));
    if v_domain <> '' then
      v_hash := hash_dedup_value(v_domain, p_pepper);
      insert into dedup_blocklist (organization_id, kind, value_hash, reason)
      values (v_org_id, 'domain', v_hash, 'Encerramento definitivo')
      on conflict (organization_id, kind, value_hash) do nothing;
    end if;
  end if;

  if v_place_id is not null and trim(v_place_id) <> '' then
    v_hash := hash_dedup_value(v_place_id, p_pepper);
    insert into dedup_blocklist (organization_id, kind, value_hash, reason)
    values (v_org_id, 'place_id', v_hash, 'Encerramento definitivo')
    on conflict (organization_id, kind, value_hash) do nothing;
  end if;

  delete from contacts where company_id = v_company_id;

  update companies
  set phone_e164 = null,
      phone_alt_e164 = null,
      email = null,
      instagram = null,
      address = null,
      notes = '[DADOS HIGIENIZADOS POR ENCERRAMENTO DEFINITIVO - LGPD]'
  where id = v_company_id;

  update leads
  set status = 'encerrado_definitivo',
      next_action = 'nenhuma',
      next_action_at = null
  where id = p_lead_id;

  insert into audit_log (organization_id, user_id, action, entity, entity_id, metadata)
  values (
    v_org_id,
    auth.uid(),
    'close_lead_permanently',
    'leads',
    p_lead_id,
    jsonb_build_object('reason', 'encerrado_definitivo', 'sanitized', true)
  );
end;
$$;

create or replace function public.process_reentry_leads()
returns int
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_updated_count int := 0;
begin
  with updated as (
    update leads
    set status = 'novo',
        cycle = 2,
        reentry_at = null,
        next_action = 'ligar',
        next_action_at = timezone('America/Sao_Paulo', now())
    where status = 'encerrado_temporario'
      and reentry_at <= current_date
    returning id, organization_id
  )
  select count(*) into v_updated_count from updated;

  return v_updated_count;
end;
$$;

-- 10. Seeds Iniciais (Agência C&F, Settings, Regras, Templates)
do $$
declare
  v_org_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into organizations (id, name)
  values (v_org_id, 'Agência C&F — Correia e Fagundes')
  on conflict (id) do update set name = excluded.name;

  insert into settings (
    organization_id, batch_size, max_attempts_week, reentry_days, default_return_days, max_reschedules, timezone
  )
  values (v_org_id, 30, 5, 60, 7, 3, 'America/Sao_Paulo')
  on conflict (organization_id) do nothing;

  insert into outcome_rules (
    organization_id, channel, outcome, occurrence, action, delay_days, delay_hours, switch_period, active
  )
  values
    (v_org_id, 'ligacao', 'nao_atendeu', 1, 'ligar', 1, 0, true, true),
    (v_org_id, 'ligacao', 'nao_atendeu', 2, 'email', 0, 0, false, true),
    (v_org_id, 'ligacao', 'caixa_postal', null, 'ligar', 1, 0, false, true),
    (v_org_id, 'ligacao', 'secretaria_barrou', null, 'ligar', 2, 0, false, true),
    (v_org_id, 'ligacao', 'numero_invalido', null, 'email', 0, 0, false, true),
    (v_org_id, 'ligacao', 'pediu_material', null, 'email', 0, 0, false, true),
    (v_org_id, 'ligacao', 'autorizou_whatsapp', null, 'whatsapp', 0, 0, false, true),
    (v_org_id, 'ligacao', 'decisor_sem_decisao', null, 'ligar', 7, 0, false, true),
    (v_org_id, 'ligacao', 'decisor_interesse', null, 'reuniao', 0, 0, false, true),
    (v_org_id, 'ligacao', 'decisor_sem_interesse', null, 'nenhuma', 0, 0, false, true),
    (v_org_id, 'email', 'enviado', null, 'ligar', 2, 0, false, true),
    (v_org_id, 'whatsapp', 'enviado', null, 'ligar', 2, 0, false, true)
  on conflict do nothing;

  insert into message_templates (organization_id, channel, name, subject, body)
  values
    (
      v_org_id,
      'email',
      'Apresentação Inicial C&F',
      'Parceria de captação ativa para {{empresa}}',
      'Olá, {{decisor}}! Tudo bem?\n\nAcompanhamos a atuação da {{empresa}} em {{cidade}} no segmento de {{nicho}} e acreditamos que podemos apoiar a estruturação da sua máquina de captação de clientes.\n\nGostaria de compartilhar um breve resumo do que implementamos para outras empresas da região. Podemos conversar 10 minutos esta semana?\n\nAbraços,\nFaul | Agência C&F'
    ),
    (
      v_org_id,
      'email',
      'Material Solicitado na Ligação',
      'Material de prospecção C&F solicitado - {{empresa}}',
      'Olá, {{decisor}}!\n\nConforme conversamos hoje por telefone, segue o material com os detalhes da nossa metodologia de prospecção e aquisição de clientes para empresas de {{nicho}}.\n\nVou te ligar novamente em 2 dias para saber sua opinião e tirar qualquer dúvida.\n\nAtenciosamente,\nFaul | Agência C&F'
    ),
    (
      v_org_id,
      'whatsapp',
      'Primeiro Contato WhatsApp (Após autorização)',
      null,
      'Olá {{decisor}}, tudo bem? Aqui é o Faul da Agência C&F. Falei com você há pouco por telefone sobre a prospecção da {{empresa}} e você autorizou o envio por aqui. Segue o link com a prévia da nossa apresentação: [link]. Me avise assim que puder dar uma olhada!'
    )
  on conflict do nothing;
end $$;
