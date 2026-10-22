# Guia de Operação — CF Leads

> Documento escrito em linguagem simples para administração e suporte operacional do sistema pelo Faul.

---

## 1. Como saber se o sistema está funcionando
- Acesse `https://cfleads.agenciacf.com.br` no navegador do celular ou computador.
- Se a tela de login carregar e você conseguir entrar normalmente, o sistema está 100% operacional.
- Para verificar o status técnico na VPS (caso necessário):
  ```bash
  docker ps --filter "name=cfleads"
  ```
  O contêiner deve constar como `Up` (em execução).

---

## 2. Como voltar para uma versão anterior (Rollback)
Se uma nova atualização apresentar qualquer falha, o retorno para a versão anterior é simples e rápido:
1. As últimas 5 versões da imagem ficam armazenadas no GitHub Packages.
2. No servidor, ajustamos a tag da imagem no arquivo `/docker/cf-leads/docker-compose.yml` para a versão anterior (ex: `v1.0.1`).
3. Executamos:
   ```bash
   docker compose pull && docker compose up -d
   ```
4. O sistema volta ao ar na versão anterior imediatamente, sem perda de dados (pois os dados ficam no banco Supabase).

---

## 3. Backups e Restauração
- **Onde fica o banco:** No Supabase Cloud com réplicas e snapshots automáticos da plataforma.
- **Backup extra fora do Supabase:** Uma rotina automática diária envia uma cópia criptografada (`pg_dump`) para o armazenamento seguro no Backblaze B2 (retenção de 30 dias).
- **Como restaurar:** Em caso de desastre, o arquivo de dump mais recente é baixado e aplicado no banco de dados através da ferramenta de linha de comando (`psql < backup.sql`).

---

## 4. Contatos de Emergência e Serviços Utilizados
- **Domínio & DNS:** Cloudflare (gerencia `agenciacf.com.br`).
- **Servidor (VPS):** Hostinger (IP: `179.197.64.18`).
- **Banco de Dados & Autenticação:** Supabase Cloud (`cfleads`).
- **Repositório de Código:** GitHub (`eufaul/cf-leads`).
- **Crawler Google Maps:** Apify.
