-- Adiciona suporte a pool de tokens da Apify na tabela settings
alter table settings
add column if not exists apify_tokens jsonb not null default '[]'::jsonb;
