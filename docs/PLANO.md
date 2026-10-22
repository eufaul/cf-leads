# Plano de Execução dos Marcos — CF Leads

Este documento acompanha a evolução dos marcos do projeto. Cada marco só é executado após a apresentação e aprovação do plano correspondente pelo Faul.

---

## Marcos do Projeto

- [x] **M0 — Diagnóstico**:
  - Contas (GitHub, Supabase Cloud).
  - Diagnóstico somente de leitura da VPS Hostinger (Traefik, portas, Docker, disco).
  - Diagnóstico de DNS de `agenciacf.com.br` no Cloudflare.
  - Relatório aprovado pelo Faul.

- [ ] **M1 — Fundação** (Em andamento):
  - Repositório Git conectado ao GitHub (`eufaul/cf-leads`).
  - Next.js (App Router, TypeScript estrito, Tailwind, shadcn/ui).
  - Regras de segurança e trabalho (`AGENTS.md`).
  - Documentação inicial (`docs/PLANO.md`, `DECISOES.md`, `OPERACAO.md`, `SEGURANCA.md`).
  - Pipeline de CI (GitHub Actions com Lint, Typecheck, Testes, Semgrep, Gitleaks, npm audit).
  - Estrutura de pastas e `.gitignore` rigoroso.

- [ ] **M2 — Banco de Dados**:
  - Migrations do Supabase (tabelas, enums, triggers de updated_at).
  - RLS obrigatório em todas as tabelas com policies estritas.
  - Funções de hashing (HMAC-SHA256 para dedup) e pg_cron (reentrada de 60 dias).
  - Testes de RLS (permissão negada / isolamento entre usuários).
  - Seeds iniciais (Agência C&F, configurações padrão, outcome_rules, templates).

- [ ] **M3 — Núcleo da Aplicação**:
  - Autenticação Supabase Auth com MFA obrigatório para admin.
  - Interface mobile-first responsiva.
  - Gestão de Leads (lista, filtros, ficha completa, histórico).
  - Cadastro rápido com verificação antecipada de duplicatas.
  - Registro de tentativa em 3 toques com motor de sugestão de próxima ação.

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
