# Gastos de Benja

PWA para tracking de gastos personales con Mercado Pago, efectivo y splits sin nombres. Telegram es la entrada rapida; la web es la trastienda para dashboard, edicion, inbox, reglas y conciliacion asistida.

## Estado actual

- Next.js App Router + Tailwind.
- Dashboard navegable con datos demo.
- Pantallas: dashboard, carga manual, splits, inbox y reglas.
- Migraciones Supabase completas para `transactions`, `mp_inbox`, `mp_movements`, `split_claims`, `split_repayments`, `auto_rules`, categorias y wallets.
- Seeds con 12 categorias iniciales y reglas predefinidas.
- Edge Functions scaffold:
  - `ingest-mp-email`
  - `telegram-webhook`
  - `sync-mp-report`
  - `split-reminders`
- Worker de Cloudflare para reenviar mails de Mercado Pago.
- Parsers y helpers de reglas/match listos para conectar al backend real.

## Desarrollo

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Variables necesarias

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_INGEST_SECRET=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=
MP_ACCESS_TOKEN=
MP_REPORT_LOOKBACK_DAYS=3
```

## Supabase

Aplicar:

```bash
supabase db push
supabase functions deploy ingest-mp-email
supabase functions deploy telegram-webhook
supabase functions deploy sync-mp-report
supabase functions deploy split-reminders
```

El job `/sync-mp-report` puede recibir filas de reporte ya validadas (`rows`), un CSV exportado (`csv`) o descargar automaticamente el reporte desde Mercado Pago usando `MP_ACCESS_TOKEN`.

## Flujo de transferencias MP

Las transferencias entrantes no dependen del mail. Se cargan desde el reporte de Mercado Pago cada 12 horas:

- 00:00 Argentina
- 12:00 Argentina

En Supabase Cron eso se programa como `0 3,15 * * *`, porque el cron corre en UTC y Argentina es UTC-3.

`/sync-mp-report` acepta `rows` ya parseadas, un `csv` del reporte o, si no recibe nada, usa `MP_ACCESS_TOKEN` para:

1. Buscar reportes procesados recientes.
2. Si no hay uno listo, crear un reporte de los ultimos `MP_REPORT_LOOKBACK_DAYS` dias.
3. Consultar la tarea durante unos segundos.
4. Descargar el CSV si ya quedo procesado.

Cuando importa entradas nuevas (`TRANSACTION_AMOUNT > 0`), no las cierra automaticamente. Cada movimiento queda con `review_status='needs_review'`. Telegram pregunta una por una:

- Pago de split
- Mensualidad
- Otro ingreso
- Descartar

Si hay un match claro contra un split abierto por monto y ventana temporal, el bot lo muestra como sugerencia, pero igual espera confirmacion.

Para que funcione sin la compu prendida, cargar `MP_ACCESS_TOKEN` como secreto de Supabase. El token se obtiene desde Mercado Pago Developers y no debe exponerse en frontend ni commitearse.
