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

- [ ] **M3 — Núcleo da Aplicação**:
  - Autenticação Supabase Auth com MFA obrigatório para admin (cadastro público desativado).
  - Layout mobile-first responsivo com navegação rápida.
  - Ficha e gestão completa de Leads.
  - Cadastro rápido com checagem prévia de duplicatas (telefone, CNPJ, domínio, place_id).
  - Modal de registro de tentativa em no máximo 3 toques com motor de sugestão de próxima ação.

- [ ] **M4 — Semana de Prospecção**:
  - Segunda-feira: montagem e sugestão do lote de 30 leads.
  - Tela "Hoje": fila priorizada de ações do dia com botões rápidos (tel, whatsapp, email).
  - Sexta-feira: revisão obrigatória do lote com atribuição de destino.
  - Ciclo de vida (retorno agendado, reentrada após 60 dias, encerramento definitivo com higienização de dados).

- [ ] **M5 — Captação via Google Maps**:
  - Integração com Apify (crawler Google Places).
  - Prévia de resultados, remoção de duplicatas/bloqueados e importação seletiva.

- [ ] **M6 — Gestão e Relatórios**:
  - Pipeline Kanban visual.
  - Relatórios de prospecção (taxa de contato, conversão, horários mais eficientes, descartes).
  - Configurações do sistema e templates de mensagem com interpolação de variáveis.

- [ ] **M7 — Publicação e Operação**:
  - Build do container Docker e publicação na VPS via Traefik.
  - Configuração do Cloudflare Access.
  - Rotina de backup do banco para Backblaze B2 com retenção de 30 dias.
  - Monitoramento de uptime e guia de operação final.

- [ ] **M8 — Revisão de Segurança**:
  - Auditoria externa de segurança (OWASP ASVS Nível 1).
  - Varredura OWASP ZAP baseline.
