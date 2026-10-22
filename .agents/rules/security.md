# Regras de Segurança e Trabalho — CF Leads

Leia sempre `AGENTS.md` na raiz do repositório para o conjunto completo de diretrizes.

- Usuário: Faul (não programador). Explicar tudo em português simples, direto, sem jargões desnecessários.
- Apresentar plano de cada marco e aguardar aprovação antes de executar.
- Jamais realizar ações destrutivas sem aprovação explícita.
- Não usar modo turbo em comandos que tocam a VPS ou banco de produção.
- Toda tabela nova com RLS habilitado e testes de acesso negado.
- Validar todas as entradas no servidor com Zod.
- Jamais expor SUPABASE_SERVICE_ROLE_KEY no cliente.
- URLs externas acessadas somente via safeFetch helper.
