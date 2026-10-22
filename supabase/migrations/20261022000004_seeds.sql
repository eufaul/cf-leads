-- ==============================================================================
-- CF Leads — Migration 04: Seeds Iniciais (Agência C&F, Settings, Regras, Modelos)
-- ==============================================================================

do $$
declare
  v_org_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- 1. Organização Principal: Agência C&F
  insert into organizations (id, name)
  values (v_org_id, 'Agência C&F — Correia e Fagundes')
  on conflict (id) do update set name = excluded.name;

  -- 2. Configurações Padrão (Settings)
  insert into settings (
    organization_id,
    batch_size,
    max_attempts_week,
    reentry_days,
    default_return_days,
    max_reschedules,
    timezone
  )
  values (
    v_org_id,
    30,
    5,
    60,
    7,
    3,
    'America/Sao_Paulo'
  )
  on conflict (organization_id) do nothing;

  -- 3. Regras de Próxima Ação (outcome_rules)
  insert into outcome_rules (
    organization_id, channel, outcome, occurrence, action, delay_days, delay_hours, switch_period, active
  )
  values
    -- Ligação: não atendeu (1ª vez) -> Ligar amanhã alternando período
    (v_org_id, 'ligacao', 'nao_atendeu', 1, 'ligar', 1, 0, true, true),
    -- Ligação: não atendeu (2ª vez) -> Enviar e-mail hoje
    (v_org_id, 'ligacao', 'nao_atendeu', 2, 'email', 0, 0, false, true),
    -- Ligação: caixa postal -> Ligar amanhã
    (v_org_id, 'ligacao', 'caixa_postal', null, 'ligar', 1, 0, false, true),
    -- Ligação: secretária barrou -> Ligar em 2 dias
    (v_org_id, 'ligacao', 'secretaria_barrou', null, 'ligar', 2, 0, false, true),
    -- Ligação: número inválido -> Enviar e-mail hoje
    (v_org_id, 'ligacao', 'numero_invalido', null, 'email', 0, 0, false, true),
    -- Ligação: decisor pediu material -> E-mail hoje
    (v_org_id, 'ligacao', 'pediu_material', null, 'email', 0, 0, false, true),
    -- Ligação: decisor autorizou WhatsApp -> WhatsApp hoje
    (v_org_id, 'ligacao', 'autorizou_whatsapp', null, 'whatsapp', 0, 0, false, true),
    -- Ligação: decisor sem decisão -> Agendar retorno
    (v_org_id, 'ligacao', 'decisor_sem_decisao', null, 'ligar', 7, 0, false, true),
    -- Ligação: decisor com interesse -> Agendar reunião
    (v_org_id, 'ligacao', 'decisor_interesse', null, 'reuniao', 0, 0, false, true),
    -- Ligação: decisor sem interesse -> Nenhuma ação (descarte)
    (v_org_id, 'ligacao', 'decisor_sem_interesse', null, 'nenhuma', 0, 0, false, true),
    -- E-mail: enviado sem resposta -> Ligar em 2 dias
    (v_org_id, 'email', 'enviado', null, 'ligar', 2, 0, false, true),
    -- WhatsApp: enviado sem resposta -> Ligar em 2 dias
    (v_org_id, 'whatsapp', 'enviado', null, 'ligar', 2, 0, false, true)
  on conflict do nothing;

  -- 4. Modelos de Mensagem Padrão (message_templates)
  insert into message_templates (
    organization_id, channel, name, subject, body
  )
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
