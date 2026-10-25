-- CF LEADS: SCHEMA, TABELAS, SEGURANÇA E DADOS INICIAIS
-- Copie TODO este arquivo (do início ao fim) e cole no SQL Editor do Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'gestor', 'vendedor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_source') THEN
    CREATE TYPE company_source AS ENUM ('manual', 'google_maps');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE lead_status AS ENUM ('novo', 'no_lote', 'retorno_agendado', 'oportunidade', 'descartado', 'encerrado_temporario', 'encerrado_definitivo');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'next_action_type') THEN
    CREATE TYPE next_action_type AS ENUM ('ligar', 'email', 'whatsapp', 'reuniao', 'nenhuma');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weekly_batch_status') THEN
    CREATE TYPE weekly_batch_status AS ENUM ('aberto', 'em_revisao', 'fechado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_item_destination') THEN
    CREATE TYPE batch_item_destination AS ENUM ('oportunidade', 'retorno_agendado', 'encerrado_temporario', 'encerrado_definitivo', 'descartado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type') THEN
    CREATE TYPE channel_type AS ENUM ('ligacao', 'email', 'whatsapp', 'sms', 'reuniao');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attempt_outcome') THEN
    CREATE TYPE attempt_outcome AS ENUM ('nao_atendeu', 'caixa_postal', 'numero_invalido', 'secretaria_barrou', 'decisor_interesse', 'decisor_sem_interesse', 'decisor_sem_decisao', 'pediu_material', 'autorizou_whatsapp', 'enviado', 'respondeu', 'opt_out');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dedup_kind') THEN
    CREATE TYPE dedup_kind AS ENUM ('phone', 'cnpj', 'domain', 'place_id');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'search_job_status') THEN
    CREATE TYPE search_job_status AS ENUM ('rodando', 'concluido', 'erro');
  END IF;
END $$;

-- TRIGGER DE UPDATED_AT
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$;

-- TABELAS
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role user_role NOT NULL DEFAULT 'vendedor',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  batch_size int NOT NULL DEFAULT 30,
  max_attempts_week int NOT NULL DEFAULT 5,
  reentry_days int NOT NULL DEFAULT 60,
  default_return_days int NOT NULL DEFAULT 7,
  max_reschedules int NOT NULL DEFAULT 3,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  cnpj text,
  phone_e164 text,
  phone_alt_e164 text,
  phone_invalid boolean NOT NULL DEFAULT false,
  email text,
  website text,
  instagram text,
  address text,
  city text,
  state text,
  niche text,
  source company_source NOT NULL DEFAULT 'manual',
  google_place_id text,
  google_rating numeric(3,2),
  google_reviews int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role_title text,
  is_decision_maker boolean NOT NULL DEFAULT false,
  phone_e164 text,
  email text,
  best_time_notes text,
  whatsapp_optin_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status lead_status NOT NULL DEFAULT 'novo',
  cycle int NOT NULL DEFAULT 1,
  reentry_at date,
  scheduled_return_at timestamptz,
  reschedule_count int NOT NULL DEFAULT 0,
  next_action next_action_type NOT NULL DEFAULT 'nenhuma',
  next_action_at timestamptz,
  discard_reason text,
  last_decision_maker_contact_at timestamptz,
  opt_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS weekly_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  status weekly_batch_status NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(owner_id, week_start)
);

CREATE TABLE IF NOT EXISTS batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES weekly_batches(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  destination batch_item_destination,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(batch_id, lead_id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES weekly_batches(id) ON DELETE SET NULL,
  channel channel_type NOT NULL,
  outcome attempt_outcome NOT NULL,
  reached_decision_maker boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  duration_seconds int,
  notes text,
  suggested_action text,
  suggested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS outcome_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel channel_type NOT NULL,
  outcome attempt_outcome NOT NULL,
  occurrence int,
  action next_action_type NOT NULL,
  delay_days int NOT NULL DEFAULT 0,
  delay_hours int NOT NULL DEFAULT 0,
  switch_period boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel channel_type NOT NULL,
  name text NOT NULL,
  subject text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS dedup_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind dedup_kind NOT NULL,
  value_hash text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(organization_id, kind, value_hash)
);

CREATE TABLE IF NOT EXISTS search_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  niche text NOT NULL,
  city text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  apify_run_id text,
  status search_job_status NOT NULL DEFAULT 'rodando',
  results jsonb,
  results_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_at ON leads(next_action_at);
CREATE INDEX IF NOT EXISTS idx_companies_phone_e164 ON companies(organization_id, phone_e164);
CREATE INDEX IF NOT EXISTS idx_companies_place_id ON companies(organization_id, google_place_id);
CREATE INDEX IF NOT EXISTS idx_attempts_lead_occurred ON attempts(lead_id, occurred_at DESC);

-- FUNÇÕES AUXILIARES DE RLS
CREATE OR REPLACE FUNCTION public.auth_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND active = true LIMIT 1;
$$;

-- ATIVAÇÃO DE RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedup_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS
CREATE POLICY "org_select" ON organizations FOR SELECT USING (id = public.auth_org_id());
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (id = public.auth_org_id() AND public.auth_role() = 'admin');

CREATE POLICY "prof_select" ON profiles FOR SELECT USING (organization_id = public.auth_org_id());
CREATE POLICY "prof_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid() OR public.auth_role() IN ('admin', 'gestor'));
CREATE POLICY "prof_update" ON profiles FOR UPDATE USING (id = auth.uid() OR public.auth_role() IN ('admin', 'gestor'));

CREATE POLICY "sett_select" ON settings FOR SELECT USING (organization_id = public.auth_org_id());
CREATE POLICY "sett_update" ON settings FOR UPDATE USING (organization_id = public.auth_org_id() AND public.auth_role() IN ('admin', 'gestor'));

CREATE POLICY "comp_select" ON companies FOR SELECT USING (organization_id = public.auth_org_id());
CREATE POLICY "comp_insert" ON companies FOR INSERT WITH CHECK (organization_id = public.auth_org_id());
CREATE POLICY "comp_update" ON companies FOR UPDATE USING (organization_id = public.auth_org_id());
CREATE POLICY "comp_delete" ON companies FOR DELETE USING (organization_id = public.auth_org_id() AND public.auth_role() = 'admin');

CREATE POLICY "cont_select" ON contacts FOR SELECT USING (organization_id = public.auth_org_id());
CREATE POLICY "cont_insert" ON contacts FOR INSERT WITH CHECK (organization_id = public.auth_org_id());
CREATE POLICY "cont_update" ON contacts FOR UPDATE USING (organization_id = public.auth_org_id());
CREATE POLICY "cont_delete" ON contacts FOR DELETE USING (organization_id = public.auth_org_id() AND public.auth_role() = 'admin');

CREATE POLICY "lead_select" ON leads FOR SELECT USING (
  organization_id = public.auth_org_id() AND (
    public.auth_role() IN ('admin', 'gestor') OR owner_id = auth.uid() OR owner_id IS NULL
  )
);
CREATE POLICY "lead_insert" ON leads FOR INSERT WITH CHECK (organization_id = public.auth_org_id());
CREATE POLICY "lead_update" ON leads FOR UPDATE USING (
  organization_id = public.auth_org_id() AND (
    public.auth_role() IN ('admin', 'gestor') OR owner_id = auth.uid()
  )
);
CREATE POLICY "lead_delete" ON leads FOR DELETE USING (organization_id = public.auth_org_id() AND public.auth_role() = 'admin');

CREATE POLICY "batch_select" ON weekly_batches FOR SELECT USING (
  organization_id = public.auth_org_id() AND (public.auth_role() IN ('admin', 'gestor') OR owner_id = auth.uid())
);
CREATE POLICY "batch_insert" ON weekly_batches FOR INSERT WITH CHECK (
  organization_id = public.auth_org_id() AND (public.auth_role() IN ('admin', 'gestor') OR owner_id = auth.uid())
);
CREATE POLICY "batch_update" ON weekly_batches FOR UPDATE USING (
  organization_id = public.auth_org_id() AND (public.auth_role() IN ('admin', 'gestor') OR owner_id = auth.uid())
);

CREATE POLICY "bitems_select" ON batch_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM weekly_batches wb WHERE wb.id = batch_items.batch_id AND wb.organization_id = public.auth_org_id() AND (public.auth_role() IN ('admin', 'gestor') OR wb.owner_id = auth.uid()))
);
CREATE POLICY "bitems_insert" ON batch_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM weekly_batches wb WHERE wb.id = batch_items.batch_id AND wb.organization_id = public.auth_org_id() AND (public.auth_role() IN ('admin', 'gestor') OR wb.owner_id = auth.uid()))
);
CREATE POLICY "bitems_update" ON batch_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM weekly_batches wb WHERE wb.id = batch_items.batch_id AND wb.organization_id = public.auth_org_id() AND (public.auth_role() IN ('admin', 'gestor') OR wb.owner_id = auth.uid()))
);

CREATE POLICY "att_select" ON attempts FOR SELECT USING (
  organization_id = public.auth_org_id() AND (public.auth_role() IN ('admin', 'gestor') OR user_id = auth.uid())
);
CREATE POLICY "att_insert" ON attempts FOR INSERT WITH CHECK (
  organization_id = public.auth_org_id() AND user_id = auth.uid()
);

CREATE POLICY "rules_select" ON outcome_rules FOR SELECT USING (organization_id = public.auth_org_id());
CREATE POLICY "rules_manage" ON outcome_rules FOR ALL USING (organization_id = public.auth_org_id() AND public.auth_role() IN ('admin', 'gestor'));

CREATE POLICY "tpl_select" ON message_templates FOR SELECT USING (organization_id = public.auth_org_id());
CREATE POLICY "tpl_manage" ON message_templates FOR ALL USING (organization_id = public.auth_org_id() AND public.auth_role() IN ('admin', 'gestor'));

CREATE POLICY "dedup_select" ON dedup_blocklist FOR SELECT USING (organization_id = public.auth_org_id());
CREATE POLICY "dedup_insert" ON dedup_blocklist FOR INSERT WITH CHECK (organization_id = public.auth_org_id());

CREATE POLICY "job_select" ON search_jobs FOR SELECT USING (organization_id = public.auth_org_id());
CREATE POLICY "job_insert" ON search_jobs FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND user_id = auth.uid());
CREATE POLICY "job_update" ON search_jobs FOR UPDATE USING (organization_id = public.auth_org_id());

CREATE POLICY "aud_insert" ON audit_log FOR INSERT WITH CHECK (organization_id = public.auth_org_id());
CREATE POLICY "aud_select" ON audit_log FOR SELECT USING (organization_id = public.auth_org_id() AND public.auth_role() = 'admin');

-- FUNÇÕES DE DEDUP E LGPD
CREATE OR REPLACE FUNCTION public.hash_dedup_value(p_value text, p_pepper text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = 'extensions', 'public' AS $$
BEGIN
  IF p_value IS NULL OR trim(p_value) = '' THEN RETURN NULL; END IF;
  RETURN encode(hmac(lower(trim(p_value))::bytea, p_pepper::bytea, 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.close_lead_permanently(p_lead_id uuid, p_pepper text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'extensions' AS $$
DECLARE
  v_org_id uuid;
  v_company_id uuid;
  v_phone text;
  v_cnpj text;
  v_website text;
  v_domain text;
  v_place_id text;
  v_hash text;
BEGIN
  SELECT l.organization_id, l.company_id, c.phone_e164, c.cnpj, c.website, c.google_place_id
  INTO v_org_id, v_company_id, v_phone, v_cnpj, v_website, v_place_id
  FROM leads l JOIN companies c ON c.id = l.company_id
  WHERE l.id = p_lead_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrado.'; END IF;

  IF v_phone IS NOT NULL AND trim(v_phone) <> '' THEN
    v_hash := hash_dedup_value(v_phone, p_pepper);
    INSERT INTO dedup_blocklist (organization_id, kind, value_hash, reason)
    VALUES (v_org_id, 'phone', v_hash, 'Encerramento definitivo')
    ON CONFLICT (organization_id, kind, value_hash) DO NOTHING;
  END IF;

  IF v_cnpj IS NOT NULL AND trim(v_cnpj) <> '' THEN
    v_hash := hash_dedup_value(regexp_replace(v_cnpj, '\D', '', 'g'), p_pepper);
    INSERT INTO dedup_blocklist (organization_id, kind, value_hash, reason)
    VALUES (v_org_id, 'cnpj', v_hash, 'Encerramento definitivo')
    ON CONFLICT (organization_id, kind, value_hash) DO NOTHING;
  END IF;

  IF v_website IS NOT NULL AND trim(v_website) <> '' THEN
    v_domain := lower(regexp_replace(regexp_replace(v_website, '^https?://(www\.)?', ''), '/.*$', ''));
    IF v_domain <> '' THEN
      v_hash := hash_dedup_value(v_domain, p_pepper);
      INSERT INTO dedup_blocklist (organization_id, kind, value_hash, reason)
      VALUES (v_org_id, 'domain', v_hash, 'Encerramento definitivo')
      ON CONFLICT (organization_id, kind, value_hash) DO NOTHING;
    END IF;
  END IF;

  IF v_place_id IS NOT NULL AND trim(v_place_id) <> '' THEN
    v_hash := hash_dedup_value(v_place_id, p_pepper);
    INSERT INTO dedup_blocklist (organization_id, kind, value_hash, reason)
    VALUES (v_org_id, 'place_id', v_hash, 'Encerramento definitivo')
    ON CONFLICT (organization_id, kind, value_hash) DO NOTHING;
  END IF;

  DELETE FROM contacts WHERE company_id = v_company_id;

  UPDATE companies
  SET phone_e164 = NULL, phone_alt_e164 = NULL, email = NULL, instagram = NULL, address = NULL,
      notes = '[DADOS HIGIENIZADOS POR ENCERRAMENTO DEFINITIVO - LGPD]'
  WHERE id = v_company_id;

  UPDATE leads
  SET status = 'encerrado_definitivo', next_action = 'nenhuma', next_action_at = NULL
  WHERE id = p_lead_id;

  INSERT INTO audit_log (organization_id, user_id, action, entity, entity_id, metadata)
  VALUES (v_org_id, auth.uid(), 'close_lead_permanently', 'leads', p_lead_id, jsonb_build_object('reason', 'encerrado_definitivo', 'sanitized', true));
END;
$$;

CREATE OR REPLACE FUNCTION public.process_reentry_leads()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_updated_count int := 0;
BEGIN
  WITH updated AS (
    UPDATE leads
    SET status = 'novo', cycle = 2, reentry_at = NULL, next_action = 'ligar',
        next_action_at = timezone('America/Sao_Paulo', now())
    WHERE status = 'encerrado_temporario' AND reentry_at <= current_date
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM updated;
  RETURN v_updated_count;
END;
$$;

-- DADOS INICIAIS (SEEDS)
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Agência C&F — Correia e Fagundes')
ON CONFLICT (id) DO UPDATE SET name = excluded.name;

INSERT INTO settings (organization_id, batch_size, max_attempts_week, reentry_days, default_return_days, max_reschedules, timezone)
VALUES ('00000000-0000-0000-0000-000000000001', 30, 5, 60, 7, 3, 'America/Sao_Paulo')
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO outcome_rules (organization_id, channel, outcome, occurrence, action, delay_days, delay_hours, switch_period, active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'nao_atendeu', 1, 'ligar', 1, 0, true, true),
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'nao_atendeu', 2, 'email', 0, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'caixa_postal', null, 'ligar', 1, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'secretaria_barrou', null, 'ligar', 2, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'numero_invalido', null, 'email', 0, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'pediu_material', null, 'email', 0, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'autorizou_whatsapp', null, 'whatsapp', 0, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'decisor_sem_decisao', null, 'ligar', 7, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'decisor_interesse', null, 'reuniao', 0, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'ligacao', 'decisor_sem_interesse', null, 'nenhuma', 0, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'email', 'enviado', null, 'ligar', 2, 0, false, true),
  ('00000000-0000-0000-0000-000000000001', 'whatsapp', 'enviado', null, 'ligar', 2, 0, false, true)
ON CONFLICT DO NOTHING;

INSERT INTO message_templates (organization_id, channel, name, subject, body)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'email',
    'Apresentação Inicial C&F',
    'Parceria de captação ativa para {{empresa}}',
    'Olá, {{decisor}}! Tudo bem?\n\nAcompanhamos a atuação da {{empresa}} em {{cidade}} no segmento de {{nicho}} e acreditamos que podemos apoiar a estruturação da sua máquina de captação de clientes.\n\nGostaria de compartilhar um breve resumo do que implementamos para outras empresas da região. Podemos conversar 10 minutos esta semana?\n\nAbraços,\nFaul | Agência C&F'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'email',
    'Material Solicitado na Ligação',
    'Material de prospecção C&F solicitado - {{empresa}}',
    'Olá, {{decisor}}!\n\nConforme conversamos hoje por telefone, segue o material com os detalhes da nossa metodologia de prospecção e aquisição de clientes para empresas de {{nicho}}.\n\nVou te ligar novamente em 2 dias para saber sua opinião e tirar qualquer dúvida.\n\nAtenciosamente,\nFaul | Agência C&F'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'whatsapp',
    'Primeiro Contato WhatsApp (Após autorização)',
    null,
    'Olá {{decisor}}, tudo bem? Aqui é o Faul da Agência C&F. Falei com você há pouco por telefone sobre a prospecção da {{empresa}} e você autorizou o envio por aqui. Segue o link com a prévia da nossa apresentação: [link]. Me avise assim que puder dar uma olhada!'
  )
ON CONFLICT DO NOTHING;
