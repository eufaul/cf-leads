-- ==============================================================================
-- CF Leads — Migration 02: Row Level Security (RLS) & Funções Auxiliares Seguras
-- ==============================================================================

-- 1. Funções Auxiliares SECURITY DEFINER (com search_path protegido contra injeção de schema)
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

-- 2. Habilitação de RLS em TODAS as tabelas
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

-- ==============================================================================
-- 3. Políticas de RLS
-- ==============================================================================

-- 3.1 ORGANIZATIONS
create policy "organizations_select" on organizations
  for select using (id = public.auth_org_id());

create policy "organizations_update" on organizations
  for update using (id = public.auth_org_id() and public.auth_role() = 'admin');

-- 3.2 PROFILES
create policy "profiles_select" on profiles
  for select using (organization_id = public.auth_org_id());

create policy "profiles_insert" on profiles
  for insert with check (
    -- Permite auto-criação do próprio perfil autenticado
    id = auth.uid() or public.auth_role() in ('admin', 'gestor')
  );

create policy "profiles_update" on profiles
  for update using (
    id = auth.uid() or public.auth_role() in ('admin', 'gestor')
  );

-- 3.3 SETTINGS
create policy "settings_select" on settings
  for select using (organization_id = public.auth_org_id());

create policy "settings_update" on settings
  for update using (
    organization_id = public.auth_org_id() and public.auth_role() in ('admin', 'gestor')
  );

-- 3.4 COMPANIES
create policy "companies_select" on companies
  for select using (organization_id = public.auth_org_id());

create policy "companies_insert" on companies
  for insert with check (organization_id = public.auth_org_id());

create policy "companies_update" on companies
  for update using (organization_id = public.auth_org_id());

create policy "companies_delete" on companies
  for delete using (organization_id = public.auth_org_id() and public.auth_role() = 'admin');

-- 3.5 CONTACTS
create policy "contacts_select" on contacts
  for select using (organization_id = public.auth_org_id());

create policy "contacts_insert" on contacts
  for insert with check (organization_id = public.auth_org_id());

create policy "contacts_update" on contacts
  for update using (organization_id = public.auth_org_id());

create policy "contacts_delete" on contacts
  for delete using (organization_id = public.auth_org_id() and public.auth_role() = 'admin');

-- 3.6 LEADS (vendedor vê apenas os seus ou leads sem dono no lote; admin/gestor vê tudo)
create policy "leads_select" on leads
  for select using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid() or
      owner_id is null
    )
  );

create policy "leads_insert" on leads
  for insert with check (organization_id = public.auth_org_id());

create policy "leads_update" on leads
  for update using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid()
    )
  );

create policy "leads_delete" on leads
  for delete using (organization_id = public.auth_org_id() and public.auth_role() = 'admin');

-- 3.7 WEEKLY BATCHES
create policy "weekly_batches_select" on weekly_batches
  for select using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid()
    )
  );

create policy "weekly_batches_insert" on weekly_batches
  for insert with check (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid()
    )
  );

create policy "weekly_batches_update" on weekly_batches
  for update using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      owner_id = auth.uid()
    )
  );

-- 3.8 BATCH ITEMS
create policy "batch_items_select" on batch_items
  for select using (
    exists (
      select 1 from weekly_batches wb
      where wb.id = batch_items.batch_id
        and wb.organization_id = public.auth_org_id()
        and (public.auth_role() in ('admin', 'gestor') or wb.owner_id = auth.uid())
    )
  );

create policy "batch_items_insert" on batch_items
  for insert with check (
    exists (
      select 1 from weekly_batches wb
      where wb.id = batch_items.batch_id
        and wb.organization_id = public.auth_org_id()
        and (public.auth_role() in ('admin', 'gestor') or wb.owner_id = auth.uid())
    )
  );

create policy "batch_items_update" on batch_items
  for update using (
    exists (
      select 1 from weekly_batches wb
      where wb.id = batch_items.batch_id
        and wb.organization_id = public.auth_org_id()
        and (public.auth_role() in ('admin', 'gestor') or wb.owner_id = auth.uid())
    )
  );

-- 3.9 ATTEMPTS
create policy "attempts_select" on attempts
  for select using (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('admin', 'gestor') or
      user_id = auth.uid()
    )
  );

create policy "attempts_insert" on attempts
  for insert with check (
    organization_id = public.auth_org_id() and user_id = auth.uid()
  );

-- 3.10 OUTCOME RULES
create policy "outcome_rules_select" on outcome_rules
  for select using (organization_id = public.auth_org_id());

create policy "outcome_rules_manage" on outcome_rules
  for all using (
    organization_id = public.auth_org_id() and public.auth_role() in ('admin', 'gestor')
  );

-- 3.11 MESSAGE TEMPLATES
create policy "message_templates_select" on message_templates
  for select using (organization_id = public.auth_org_id());

create policy "message_templates_manage" on message_templates
  for all using (
    organization_id = public.auth_org_id() and public.auth_role() in ('admin', 'gestor')
  );

-- 3.12 DEDUP BLOCKLIST
create policy "dedup_blocklist_select" on dedup_blocklist
  for select using (organization_id = public.auth_org_id());

create policy "dedup_blocklist_insert" on dedup_blocklist
  for insert with check (organization_id = public.auth_org_id());

-- 3.13 SEARCH JOBS
create policy "search_jobs_select" on search_jobs
  for select using (organization_id = public.auth_org_id());

create policy "search_jobs_insert" on search_jobs
  for insert with check (organization_id = public.auth_org_id() and user_id = auth.uid());

create policy "search_jobs_update" on search_jobs
  for update using (organization_id = public.auth_org_id());

-- 3.14 AUDIT LOG (Somente INSERT; SELECT apenas admin; Proibido UPDATE e DELETE)
create policy "audit_log_insert" on audit_log
  for insert with check (organization_id = public.auth_org_id());

create policy "audit_log_select" on audit_log
  for select using (
    organization_id = public.auth_org_id() and public.auth_role() = 'admin'
  );
