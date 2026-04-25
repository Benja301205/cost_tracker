-- Supabase Cron template.
-- Argentina 00:00 and 12:00 = UTC 03:00 and 15:00.
-- Replace <PROJECT_REF> and <CRON_SECRET> before running.
-- This triggers the function. If MP_ACCESS_TOKEN is configured in Supabase
-- secrets, the function will create/list/download the Mercado Pago report itself.

select
  cron.schedule(
    'sync-mp-report-12h',
    '0 3,15 * * *',
    $$
    select
      net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-mp-report',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer <CRON_SECRET>'
        ),
        body := jsonb_build_object()
      );
    $$
  );
