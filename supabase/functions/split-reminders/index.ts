import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.headers.get("authorization") !== `Bearer ${Deno.env.get("CRON_SECRET")}`) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const supabase = serviceClient();
  const { data: dueSplits, error } = await supabase
    .from("split_claim_status")
    .select("id,label,amount_per_payer_ars,remaining_payers,pending_amount_ars,reminder_stage")
    .lte("remind_at", new Date().toISOString())
    .in("calculated_status", ["pending", "partially_paid"]);

  if (error) throw error;

  for (const split of dueSplits ?? []) {
    await sendTelegram(`Recordatorio\n${split.label}: faltan ${split.remaining_payers} pagos de $${Number(split.amount_per_payer_ars).toLocaleString("es-AR")}.\nPendiente: $${Number(split.pending_amount_ars).toLocaleString("es-AR")}.`);
    const next = nextReminder(Number(split.reminder_stage ?? 0));
    await supabase.from("split_claims").update({
      reminder_stage: next.stage,
      remind_at: next.remindAt,
    }).eq("id", split.id);
  }

  return Response.json({ sent: dueSplits?.length ?? 0 }, { headers: corsHeaders });
});

function nextReminder(stage: number) {
  if (stage === 0) return { stage: 1, remindAt: new Date(Date.now() + 3 * 86400000).toISOString() };
  if (stage === 1) return { stage: 2, remindAt: new Date(Date.now() + 7 * 86400000).toISOString() };
  return { stage: 3, remindAt: null };
}

async function sendTelegram(text: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) throw new Error("Missing Telegram config");
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
