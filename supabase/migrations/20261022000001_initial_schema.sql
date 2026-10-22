-- ==============================================================================
-- CF Leads — Migration 01: Schema Inicial (Tabelas, Enums, Índices, Triggers)
-- ==============================================================================

-- 1. Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Enums
create type user_role as enum ('admin', 'gestor', 'vendedor');
create type company_source as enum ('manual', 'google_maps');
create type lead_status as enum (
  'novo',
  'no_lote',
  'retorno_agendado',
  'oportunidade',
  'descartado',
  'encerrado_temporario',
  'encerrado_definitivo'
);
create type next_action_type as enum ('ligar', 'email', 'whatsapp', 'reuniao', 'nenhuma');
create type weekly_batch_status as enum ('aberto', 'em_revisao', 'fechado');
create type batch_item_destination as enum (
  'oportunidade',
  'retorno_agendado',
  'encerrado_temporario',
  'encerrado_definitivo',
  'descartado'
);
create type channel_type as enum ('ligacao', 'email', 'whatsapp', 'sms', 'reuniao');
create type attempt_outcome as enum (
  'nao_atendeu',
  'caixa_postal',
  'numero_invalido',
  'secretaria_barrou',
  'decisor_interesse',
  'decisor_sem_interesse',
  'decisor_sem_decisao',
  'pediu_material',
  'autorizou_whatsapp',
  'enviado',
  'respondeu',
  'opt_out'
);
create type dedup_kind as enum ('phone', 'cnpj', 'domain', 'place_id');
create type search_job_status as enum ('rodando', 'concluido', 'erro');

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
create trigger tr_attempts_updated_at
  before update on attempts
  for each row execute function set_updated_at();

-- 4.10 Regras de Próxima Ação (Motor de Regras)
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
create trigger tr_outcome_rules_updated_at
  before update on outcome_rules
  for each row execute function set_updated_at();

-- 4.11 Modelos de Mensagem (Templates)
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

-- 4.13 Jobs de Busca (Apify Crawler Google Maps)
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
create trigger tr_search_jobs_updated_at
  before update on search_jobs
  for each row execute function set_updated_at();

-- 4.14 Trilha de Auditoria (Audit Log — Apenas INSERT)
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

-- 5. Índices de Performance e Consulta Frequente
create index if not exists idx_leads_org_status on leads(organization_id, status);
create index if not exists idx_leads_next_action_at on leads(next_action_at);
create index if not exists idx_companies_phone_e164 on companies(organization_id, phone_e164);
create index if not exists idx_companies_place_id on companies(organization_id, google_place_id);
create index if not exists idx_attempts_lead_occurred on attempts(lead_id, occurred_at desc);
create index if not exists idx_batch_items_batch on batch_items(batch_id);
create index if not exists idx_contacts_company on contacts(company_id);
create index if not exists idx_dedup_hash on dedup_blocklist(organization_id, kind, value_hash);
create index if not exists idx_audit_log_org on audit_log(organization_id, created_at desc);
