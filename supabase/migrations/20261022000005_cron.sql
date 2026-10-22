-- Habilitação do pg_cron e agendamento da rotina diária de reentrada (03:00)
create extension if not exists pg_cron with schema extensions;

-- Agenda para rodar todo dia às 03:00 (America/Sao_Paulo corresponde a 06:00 UTC)
select cron.schedule(
  'process_reentry_leads_daily',
  '0 6 * * *',
  'select public.process_reentry_leads();'
);
