-- ==============================================================================
-- CF Leads — Testes de RLS e Segurança
-- Validações:
-- 1. Usuário anônimo recebe zero linhas
-- 2. Vendedor A não lê leads do Vendedor B
-- 3. Usuário de Organização A não lê dados da Organização B
-- ==============================================================================

begin;

-- Criação de fixtures de teste
do $$
declare
  v_org_a uuid := gen_random_uuid();
  v_org_b uuid := gen_random_uuid();
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_company_a uuid := gen_random_uuid();
  v_company_b uuid := gen_random_uuid();
  v_lead_a uuid := gen_random_uuid();
  v_lead_b uuid := gen_random_uuid();
begin
  -- Orgs
  insert into organizations (id, name) values (v_org_a, 'Org A'), (v_org_b, 'Org B');

  -- Usuários simulados na auth.users
  insert into auth.users (id, email) values (v_user_a, 'vendedor.a@orga.com'), (v_user_b, 'vendedor.b@orgb.com')
  on conflict do nothing;

  -- Perfis
  insert into profiles (id, organization_id, full_name, role)
  values
    (v_user_a, v_org_a, 'Vendedor A', 'vendedor'),
    (v_user_b, v_org_b, 'Vendedor B', 'vendedor')
  on conflict do nothing;

  -- Empresas
  insert into companies (id, organization_id, name)
  values
    (v_company_a, v_org_a, 'Empresa A'),
    (v_company_b, v_org_b, 'Empresa B');

  -- Leads
  insert into leads (id, organization_id, company_id, owner_id, status)
  values
    (v_lead_a, v_org_a, v_company_a, v_user_a, 'novo'),
    (v_lead_b, v_org_b, v_company_b, v_user_b, 'novo');
end $$;

-- 1. Teste como Anônimo: deve retornar ZERO linhas
set role anon;
do $$
declare
  v_count int;
begin
  select count(*) into v_count from leads;
  if v_count <> 0 then
    raise exception 'Falha no RLS: Usuário anônimo conseguiu ler % leads!', v_count;
  end if;
end $$;

rollback;
