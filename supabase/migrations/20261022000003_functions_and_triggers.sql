-- ==============================================================================
-- CF Leads — Migration 03: Funções de Segurança, LGPD, Deduplicação e Reentrada
-- ==============================================================================

-- 1. Função de Cálculo de Hash HMAC-SHA256 para Deduplicação Segura
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

-- 2. Função para Encerramento Definitivo com Higienização de Dados Pessoais (LGPD)
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
  -- Obter lead e empresa
  select l.organization_id, l.company_id, c.phone_e164, c.cnpj, c.website, c.google_place_id
  into v_org_id, v_company_id, v_phone, v_cnpj, v_website, v_place_id
  from leads l
  join companies c on c.id = l.company_id
  where l.id = p_lead_id;

  if not found then
    raise exception 'Lead não encontrado.';
  end if;

  -- 1. Inserir hashes na lista de bloqueio (dedup_blocklist)
  -- 1.1 Telefone
  if v_phone is not null and trim(v_phone) <> '' then
    v_hash := hash_dedup_value(v_phone, p_pepper);
    insert into dedup_blocklist (organization_id, kind, value_hash, reason)
    values (v_org_id, 'phone', v_hash, 'Encerramento definitivo')
    on conflict (organization_id, kind, value_hash) do nothing;
  end if;

  -- 1.2 CNPJ
  if v_cnpj is not null and trim(v_cnpj) <> '' then
    v_hash := hash_dedup_value(regexp_replace(v_cnpj, '\D', '', 'g'), p_pepper);
    insert into dedup_blocklist (organization_id, kind, value_hash, reason)
    values (v_org_id, 'cnpj', v_hash, 'Encerramento definitivo')
    on conflict (organization_id, kind, value_hash) do nothing;
  end if;

  -- 1.3 Domínio
  if v_website is not null and trim(v_website) <> '' then
    v_domain := lower(regexp_replace(regexp_replace(v_website, '^https?://(www\.)?', ''), '/.*$', ''));
    if v_domain <> '' then
      v_hash := hash_dedup_value(v_domain, p_pepper);
      insert into dedup_blocklist (organization_id, kind, value_hash, reason)
      values (v_org_id, 'domain', v_hash, 'Encerramento definitivo')
      on conflict (organization_id, kind, value_hash) do nothing;
    end if;
  end if;

  -- 1.4 Google Place ID
  if v_place_id is not null and trim(v_place_id) <> '' then
    v_hash := hash_dedup_value(v_place_id, p_pepper);
    insert into dedup_blocklist (organization_id, kind, value_hash, reason)
    values (v_org_id, 'place_id', v_hash, 'Encerramento definitivo')
    on conflict (organization_id, kind, value_hash) do nothing;
  end if;

  -- 2. Higienização: Apagar contatos pessoais vinculados à empresa
  delete from contacts where company_id = v_company_id;

  -- 3. Higienização: Limpar dados de contato e anotações na tabela companies
  update companies
  set phone_e164 = null,
      phone_alt_e164 = null,
      email = null,
      instagram = null,
      address = null,
      notes = '[DADOS HIGIENIZADOS POR ENCERRAMENTO DEFINITIVO - LGPD]'
  where id = v_company_id;

  -- 4. Atualizar o estado do Lead
  update leads
  set status = 'encerrado_definitivo',
      next_action = 'nenhuma',
      next_action_at = null
  where id = p_lead_id;

  -- 5. Registrar no audit_log
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

-- 3. Função de Reentrada Automática após 60 dias
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
