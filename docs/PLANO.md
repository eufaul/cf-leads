# Plano de Execução dos Marcos — CF Leads

Este documento acompanha a evolução dos marcos do projeto. Cada marco só é executado após a apresentação e aprovação do plano correspondente pelo Faul.

---

## Marcos do Projeto

- [x] **M0 — Diagnóstico**:
  - Contas (GitHub, Supabase Cloud).
  - Diagnóstico somente de leitura da VPS Hostinger (Traefik, portas, Docker, disco).
  - Diagnóstico de DNS de `agenciacf.com.br` no Cloudflare.
  - Relatório aprovado pelo Faul.

- [x] **M1 — Fundação**:
  - Repositório Git conectado ao GitHub (`eufaul/cf-leads`).
  - Next.js (App Router, TypeScript estrito, Tailwind, shadcn/ui).
  - Regras de segurança e trabalho (`AGENTS.md`).
  - Documentação inicial (`docs/PLANO.md`, `DECISOES.md`, `OPERACAO.md`, `SEGURANCA.md`).
  - Pipeline de CI (GitHub Actions com Lint, Typecheck, Testes, Semgrep, Gitleaks, npm audit).
  - Estrutura de pastas e `.gitignore` rigoroso.

- [x] **M2 — Banco de Dados**:
  - 13 tabelas criadas no Supabase Cloud (`organizations`, `profiles`, `settings`, `companies`, `contacts`, `leads`, `weekly_batches`, `batch_items`, `attempts`, `outcome_rules`, `message_templates`, `dedup_blocklist`, `search_jobs`, `audit_log`).
  - RLS (*Row Level Security*) ativo em 100% das tabelas com políticas de isolamento por organização e perfil.
  - Funções de segurança e privacidade (LGPD: higienização e hashes HMAC-SHA256 em `dedup_blocklist`).
  - Função de reentrada automática após 60 dias (`process_reentry_leads`).
  - Seeds iniciais inseridos com sucesso (Agência C&F, configurações padrão, 12 regras de próxima ação e 3 modelos de mensagem).
  - Testes de acesso anônimo validados com sucesso (0 vazamentos).

- [x] **M3 — Núcleo da Aplicação**:
  - Autenticação Supabase Auth com sessão SSR, cookies seguros e proteção por Middleware.
  - Perfil inicial de Administrador criado e vinculado à Agência C&F (`cadastros@agenciacf.com.br`).
  - Layout mobile-first com navegação inferior rápida (`BottomNav`) e cabeçalho de status (`TopHeader`).
  - Cadastro rápido de leads com validação Zod e bloqueio prévio de duplicatas por telefone, CNPJ, domínio ou Google Place ID.
  - Ficha completa do lead com dados da empresa, contatos (destaque para decisor), histórico de tentativas e botões diretos de ligação (`tel:`), WhatsApp (`wa.me`) e e-mail.
  - Modal de registro de tentativa em até 3 toques com aplicação imediata do motor de regras de próxima ação (`outcome_rules`).
  - Suíte de 10 testes unitários passando com 100% de sucesso.

- [x] **M4 — Semana de Prospecção**:
  - Algoritmo inteligente de montagem e sugestão dos 30 leads (prioriza reentradas vencidas do ciclo 2 sobre novos leads).
  - Confirmação de lote (`weekly_batches` e `batch_items`), transição de estado para `no_lote` e agendamento da 1ª ligação.
  - Tela de Revisão Obrigatória de Sexta-feira com destinação individual por lead (`oportunidade`, `retorno_agendado`, `descartado`, `encerrado_temporario`).
  - Trava operacional de sistema: obriga a revisão pendente de lote anterior antes de permitir a abertura de novo lote.
  - Regra de transição de ciclo: lead em ciclo 2 sem falar com decisor vira automaticamente `encerrado_definitivo` com higienização de dados pessoais e hashes na lista de bloqueio.
  - Resolução completa dos erros 404: rotas `/lote`, `/pipeline`, `/relatorios`, `/config` e `/buscar` implementadas e integradas.

- [x] **M5 — Captação via Google Maps**:
  - Módulo de integração com Apify (crawler Google Places `compass/crawler-google-places`) via `safeFetch`.
  - Mecanismo anti-duplicação na prévia: compara contra empresas existentes e contra a lista de bloqueio por hashes (LGPD).
  - Interface `/buscar`: pesquisa por nicho e cidade, filtro opcional "somente sem site oficial", prévia detalhada com rating e reviews.
  - Seleção em lote com 1 clique e importação instantânea para o banco (`source = 'google_maps'`, `status = 'novo'`).
  - Registro de jobs em `search_jobs` e trilha em `audit_log`.
  - 12 testes unitários validados no CI.

- [ ] **M6 — Gestão e Relatórios**:
  - Pipeline Kanban visual por estado com filtros avançados.
  - Relatórios de prospecção detalhados por período e lote.
  - Edição interativa das configurações e modelos de mensagem.

- [ ] **M7 — Publicação e Operação**:
  - Build do container Docker e publicação na VPS via Traefik.
  - Configuração do Cloudflare Access.
  - Rotina de backup do banco para Backblaze B2 com retenção de 30 dias.
  - Monitoramento de uptime e guia de operação final.

- [ ] **M8 — Revisão de Segurança**:
  - Auditoria externa de segurança (OWASP ASVS Nível 1).
  - Varredura OWASP ZAP baseline.
