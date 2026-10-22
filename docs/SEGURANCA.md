# Diretrizes e Arquitetura de Segurança — CF Leads

Este documento consolida as práticas de segurança aplicadas ao desenvolvimento e operação do CF Leads.

---

## 1. Princípios Fundamentais
1. **Defesa em Profundidade:**
   - Proteção de borda com Cloudflare (WAF e Cloudflare Access).
   - Servidor com portas protegidas (somente 80/443 públicas via Traefik).
   - Aplicação isolada em rede Docker privada.
   - Banco de dados protegido por RLS (Row Level Security) em todas as tabelas.

2. **Privilégio Mínimo:**
   - Conexão do navegador usa exclusivamente o token de usuário com a chave pública (`anon key`).
   - A chave com super-poderes (`service_role key`) nunca é exposta no frontend nem em APIs públicas.
   - O usuário de deploy no servidor é restrito, sem acesso root direto.

3. **Validação Estrita:**
   - Todas as requisições que chegam ao servidor passam por validação de esquemas via Zod.
   - Qualquer dado inválido é rejeitado antes de interagir com o banco de dados.

---

## 2. Proteção de Dados e Privacidade (LGPD)
- **Higienização de dados em encerramento definitivo:** Quando um lead é marcado como `encerrado_definitivo`, seus dados pessoais (nome, telefones, e-mail, notas) são permanentemente apagados.
- **Lista de Bloqueio por Hashes:** Para impedir que o Google Maps reinsira uma empresa já descartada definitivamente, armazenamos apenas hashes HMAC-SHA256 irreversíveis (telefone, CNPJ, domínio, Google Place ID).
- **Trilha de Auditoria (`audit_log`):** Eventos críticos (login, exportação de relatórios, descartes definitivos, alterações de permissão) são registrados em tabela que aceita apenas inserções, sem permissão de alteração ou exclusão de histórico.

---

## 3. Verificações Automáticas no CI
O repositório conta com barreiras automáticas que impedem código inseguro de ir para produção:
- **Gitleaks:** Bloqueia commits com chaves ou senhas acidentais.
- **Semgrep:** Análise de vulnerabilidades no código (injeção SQL, XSS, SSRF).
- **npm audit:** Varredura de bibliotecas de terceiros contra falhas conhecidas.
- **Testes de RLS:** Valida que usuários de organizações diferentes não conseguem ler dados alheios.
