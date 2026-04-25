import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

type MovementRow = {
  id: string;
  amount_ars: number;
  occurred_at: string;
  description: string | null;
  suggested_split_id?: string | null;
};

type MpReportTask = {
  id?: number;
  report_id?: number;
  status?: string;
  file_name?: string;
  begin_date?: string;
  end_date?: string;
  date_created?: string;
  generation_date?: string;
  last_modified?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const supabase = serviceClient();
  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body.rows)
    ? body.rows
    : typeof body.csv === "string"
      ? parseCsv(body.csv)
      : await fetchRowsFromMercadoPago(body);

  if (!Array.isArray(rows)) {
    return Response.json({ error: "rows must be an array from the validated MP report" }, { status: 400, headers: corsHeaders });
  }

  if (!rows.length) {
    return Response.json({
      inserted: 0,
      queuedForReview: 0,
      suggestedSplits: 0,
      asked: false,
      note: "No report rows were available yet. If MP just generated the report, the next cron run will download it once processed.",
    }, { headers: corsHeaders });
  }

  let inserted = 0;
  let queuedForReview = 0;
  let suggestedSplits = 0;

  for (const row of rows) {
    const amount = Number(row.TRANSACTION_AMOUNT ?? 0);
    const sourceId = row.SOURCE_ID;
    if (!sourceId || Number.isNaN(amount)) continue;

    const { data: movement, error } = await supabase
      .from("mp_movements")
      .upsert({
        source: "mp_report",
        source_id: sourceId,
        movement_type: amount > 0 ? "transfer_received" : "payment",
        direction: amount > 0 ? "in" : "out",
        amount_ars: Math.abs(amount),
        occurred_at: row.TRANSACTION_DATE ?? row.DATE ?? new Date().toISOString(),
        description: row.DESCRIPTION ?? row.SENDER_NAME ?? row.EXTERNAL_REFERENCE ?? "Movimiento MP",
        raw_payload: row,
        match_status: "unmatched",
        review_status: amount > 0 ? "needs_review" : "not_needed",
      }, { onConflict: "source_id", ignoreDuplicates: true })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!movement) continue;
    inserted++;

    if (amount <= 0) continue;
    queuedForReview++;

    const { data: matches } = await supabase
      .from("split_claim_status")
      .select("id,label,amount_per_payer_ars,created_at,calculated_status")
      .in("calculated_status", ["pending", "partially_paid"]);

    const clearMatches = (matches ?? []).filter((split) => {
      const delta = Math.abs(Number(split.amount_per_payer_ars) - Math.abs(amount));
      const created = new Date(split.created_at).getTime();
      const occurred = new Date(row.TRANSACTION_DATE ?? row.DATE ?? new Date()).getTime();
      return delta <= Number(split.amount_per_payer_ars) * 0.02 && occurred >= created && occurred <= created + 7 * 86400000;
    });

    if (clearMatches.length === 1) {
      await supabase
        .from("mp_movements")
        .update({ suggested_split_id: clearMatches[0].id })
        .eq("id", movement.id);
      suggestedSplits++;
    } else if (clearMatches.length > 1) {
      suggestedSplits++;
    }
  }

  const asked = await askNextMovementForReview();

  return Response.json({ inserted, queuedForReview, suggestedSplits, asked }, { headers: corsHeaders });
});

async function fetchRowsFromMercadoPago(body: Record<string, unknown>) {
  const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
  if (!accessToken) return [];

  const lookbackDays = Number(body.lookbackDays ?? Deno.env.get("MP_REPORT_LOOKBACK_DAYS") ?? 3);
  const end = new Date();
  const begin = new Date(end.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const processed = await findProcessedReport(accessToken, begin, end);
  if (processed?.file_name) {
    return downloadReportRows(accessToken, processed.file_name);
  }

  const created = await createReport(accessToken, begin, end);
  const taskId = created.id ?? created.report_id;
  if (!taskId) return [];

  const ready = await waitForProcessedReport(accessToken, taskId);
  if (ready?.file_name) {
    return downloadReportRows(accessToken, ready.file_name);
  }

  return [];
}

async function createReport(accessToken: string, begin: Date, end: Date): Promise<MpReportTask> {
  const response = await mpFetch(accessToken, "/v1/account/settlement_report", {
    method: "POST",
    body: JSON.stringify({
      begin_date: begin.toISOString(),
      end_date: end.toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`MP create report failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function waitForProcessedReport(accessToken: string, taskId: number) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const task = await getReportTask(accessToken, taskId);
    if (task.status === "processed") return task;
    if (task.status === "error" || task.status === "deleted") return null;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
}

async function getReportTask(accessToken: string, taskId: number): Promise<MpReportTask> {
  const response = await mpFetch(accessToken, `/v1/account/settlement_report/task/${taskId}?access_token=${encodeURIComponent(accessToken)}`);
  if (!response.ok) {
    throw new Error(`MP task status failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function findProcessedReport(accessToken: string, begin: Date, end: Date) {
  const response = await mpFetch(accessToken, "/v1/account/settlement_report/list");
  if (!response.ok) return null;

  const reports = (await response.json()) as MpReportTask[];
  const beginMs = begin.getTime();
  const endMs = end.getTime();

  return reports
    .filter((report) => report.status === "processed" && report.file_name)
    .filter((report) => {
      const reportBegin = report.begin_date ? new Date(report.begin_date).getTime() : 0;
      const reportEnd = report.end_date ? new Date(report.end_date).getTime() : 0;
      return reportBegin <= endMs && reportEnd >= beginMs;
    })
    .sort((a, b) => new Date(b.last_modified ?? b.generation_date ?? b.date_created ?? 0).getTime() - new Date(a.last_modified ?? a.generation_date ?? a.date_created ?? 0).getTime())[0] ?? null;
}

async function downloadReportRows(accessToken: string, fileName: string) {
  const response = await mpFetch(accessToken, `/v1/account/settlement_report/${encodeURIComponent(fileName)}`);
  if (!response.ok) {
    throw new Error(`MP download report failed: ${response.status} ${await response.text()}`);
  }
  return parseCsv(await response.text());
}

function mpFetch(accessToken: string, path: string, init: RequestInit = {}) {
  return fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });
}

async function askNextMovementForReview() {
  const supabase = serviceClient();
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!chatId || !token) return false;

  const { data: alreadyAsked } = await supabase
    .from("mp_movements")
    .select("id")
    .eq("review_status", "asked")
    .limit(1)
    .maybeSingle();

  if (alreadyAsked) return false;

  const { data: movement } = await supabase
    .from("mp_movements")
    .select("id,amount_ars,occurred_at,description,suggested_split_id")
    .eq("direction", "in")
    .eq("review_status", "needs_review")
    .order("occurred_at", { ascending: true })
    .limit(1)
    .maybeSingle<MovementRow>();

  if (!movement) return false;

  const message = await sendMovementQuestion(Number(chatId), movement, token);
  await supabase
    .from("mp_movements")
    .update({ review_status: "asked", telegram_message_id: message.result?.message_id })
    .eq("id", movement.id);

  return true;
}

async function sendMovementQuestion(chatId: number, movement: MovementRow, token: string) {
  const amount = Number(movement.amount_ars).toLocaleString("es-AR");
  const when = new Date(movement.occurred_at).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const keyboard = movement.suggested_split_id
    ? [
        [{ text: "Si, pago del split sugerido", callback_data: `mp:${movement.id}:suggested_split` }],
        [{ text: "Elegir otro split", callback_data: `mp:${movement.id}:choose_split` }],
        [{ text: "Mensualidad", callback_data: `mp:${movement.id}:income_allowance` }],
        [{ text: "Otro ingreso", callback_data: `mp:${movement.id}:income_other` }],
        [{ text: "Descartar", callback_data: `mp:${movement.id}:ignore` }],
      ]
    : [
        [{ text: "Pago de split", callback_data: `mp:${movement.id}:choose_split` }],
        [{ text: "Mensualidad", callback_data: `mp:${movement.id}:income_allowance` }],
        [{ text: "Otro ingreso", callback_data: `mp:${movement.id}:income_other` }],
        [{ text: "Descartar", callback_data: `mp:${movement.id}:ignore` }],
      ];

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `Entro plata por MP: $${amount}\n${movement.description ?? "Movimiento MP"} · ${when}\n\n¿Que es?`,
      reply_markup: { inline_keyboard: keyboard },
    }),
  });

  return response.json();
}

function parseCsv(csv: string) {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  if (!headerLine) return [];
  const headers = splitCsvLine(headerLine);
  return lines.filter(Boolean).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}
