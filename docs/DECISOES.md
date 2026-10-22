# Registro de Decisões de Arquitetura — CF Leads

Todas as decisões relevantes de arquitetura e infraestrutura são documentadas aqui, com data e justificativa em português claro.

---

### [2026-10-22] D-001: Traefik como Proxy Reverso e Isolamento em Rede Docker Exclusiva
- **Contexto:** A VPS Hostinger já possui Traefik rodando em modo host gerenciando outros serviços (`cf-saas`, `evolution`, `n8n`).
- **Decisão:** O CF Leads será executado em um container Docker standalone integrado ao Traefik através de labels no compose, conectado a uma rede Docker própria (`cfleads_network`).
- **Justificativa:** Mantém isolamento total em relação aos outros projetos (Evolution API, Redis, n8n) sem duplicar portas ou conflitar com as portas 80/443. O Traefik gerencia automaticamente os certificados SSL/TLS (Let's Encrypt).
- **Consequências:** Nenhuma porta pública adicional precisa ser aberta no host.

---

### [2026-10-22] D-002: Ajuste para 1 Projeto no Supabase Cloud (Produção) com CI/Local para Testes
- **Contexto:** A conta gratuita do Supabase comporta 1 projeto ativo por organização.
- **Decisão:** O projeto no Supabase Cloud (`cfleads`) será reservado exclusivamente para o ambiente de Produção. O ambiente de testes e validação de migrações/RLS rodará de forma isolada nos fluxos do GitHub Actions (CI) usando service containers de Postgres.
- **Justificativa:** Atende ao limite de projetos sem custos extras e garante que nenhum dado de teste ou migration quebrada contamine o banco de produção.
- **Consequências:** Toda migration é testada obrigatoriamente no CI antes de qualquer aplicação em produção.

---

### [2026-10-22] D-003: Cloudflare para Proteção de Borda e DNS
- **Contexto:** O domínio `agenciacf.com.br` já está apontado para a Cloudflare (`may.ns.cloudflare.com` e `zahir.ns.cloudflare.com`).
- **Decisão:** Manter o gerenciamento na Cloudflare e criar o subdomínio `cfleads.agenciacf.com.br` com Proxy ativado e Cloudflare Access.
- **Justificativa:** Zero risco de indisponibilidade para os e-mails e site institucional da agência. Camada extra de proteção de borda.
