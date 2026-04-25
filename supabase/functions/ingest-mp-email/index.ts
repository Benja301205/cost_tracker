import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("x-ingest-secret") !== Deno.env.get("EMAIL_INGEST_SECRET")) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const { rawHtml, receivedAt } = await req.json();
  const parsed = parseMpEmail(rawHtml ?? "");
  const supabase = serviceClient();

  const { data: inbox, error } = await supabase
    .from("mp_inbox")
    .insert({
      raw_html: rawHtml,
      received_at: receivedAt ?? new Date().toISOString(),
      detected_type: parsed.detectedType,
      parsed_amount_ars: parsed.amountArs,
      parsed_merchant: parsed.merchant,
      parsed_at: new Date().toISOString(),
      status: parsed.amountArs && parsed.merchant ? "pending" : "parse_failed",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });

  return Response.json({ inboxId: inbox.id, parsed }, { headers: corsHeaders });
});

function parseMpEmail(rawHtml: string) {
  const text = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const amount = text.match(/\$\s?([\d.]+(?:,\d{1,2})?)/)?.[1];
  const transferSent = /transferiste|enviaste dinero|transferencia enviada/i.test(text);
  const payment = /pagaste|pago|compra|recarga/i.test(text);
  const merchant = text.match(/(?:a|en)\s+([A-Z0-9 ._-]{3,50})(?:\s+por|\s+\$|$)/i)?.[1]?.trim();

  return {
    detectedType: transferSent ? "transfer_sent" : payment ? "expense" : "unknown",
    amountArs: amount ? Number(amount.replace(/\./g, "").replace(",", ".")) : null,
    merchant: merchant ?? null,
  };
}
