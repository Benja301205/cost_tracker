import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== Deno.env.get("TELEGRAM_WEBHOOK_SECRET")) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const update = (await req.json()) as TelegramUpdate;
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  const text = update.message?.text?.trim() ?? "";
  if (!chatId) return Response.json({ ok: true }, { headers: corsHeaders });

  if (update.callback_query?.data) {
    await handleCallback(chatId, update.callback_query.id, update.callback_query.data);
  } else if (text.startsWith("/efectivo")) {
    await handleCashCommand(chatId, text);
  } else if (text.startsWith("/pago_split")) {
    await sendOpenSplits(chatId);
  } else if (text.startsWith("/splits")) {
    await sendOpenSplits(chatId);
  } else if (text.startsWith("/saldo")) {
    await sendWalletBalance(chatId);
  } else {
    await sendTelegram(chatId, "Mandame /efectivo 1500 nafta, /pago_split, /splits o /saldo.");
  }

  return Response.json({ ok: true }, { headers: corsHeaders });
});

async function handleCallback(chatId: number, callbackQueryId: string, data: string) {
  await answerCallback(callbackQueryId);
  const [scope, movementId, action, extra] = data.split(":");
  if (scope !== "mp" || !movementId || !action) return;

  if (action === "suggested_split") {
    await resolveSuggestedSplit(chatId, movementId);
  } else if (action === "choose_split") {
    await showSplitChoices(chatId, movementId);
  } else if (action === "split" && extra) {
    await resolveSplit(chatId, movementId, extra);
  } else if (action === "income_allowance") {
    await resolveIncome(chatId, movementId, "Mensualidad");
  } else if (action === "income_other") {
    await resolveIncome(chatId, movementId, "Otro ingreso");
  } else if (action === "ignore") {
    await resolveIgnored(chatId, movementId);
  }
}

async function handleCashCommand(chatId: number, text: string) {
  const [, amountText, ...noteParts] = text.split(/\s+/);
  const amount = Number(amountText);
  if (!amount || amount <= 0) {
    await sendTelegram(chatId, "¿Cuanto? Ejemplo: /efectivo 1500 nafta YPF");
    return;
  }

  const note = noteParts.join(" ");
  const supabase = serviceClient();
  const { data: wallet } = await supabase.from("wallets").select("id").eq("name", "cash").single();
  const { data: category } = await supabase.from("categories").select("id, name").ilike("name", `%${noteParts[0] ?? "Varios"}%`).limit(1).maybeSingle();
  const fallback = await supabase.from("categories").select("id, name").eq("name", "Varios").single();

  await supabase.from("transactions").insert({
    amount_ars: amount,
    occurred_at: new Date().toISOString(),
    category_id: category?.id ?? fallback.data?.id,
    wallet_id: wallet?.id,
    kind: "expense",
    merchant: note || "Efectivo",
    description: note,
    source: "telegram",
  });

  await sendTelegram(chatId, `Registrado: $${amount.toLocaleString("es-AR")} en efectivo${category?.name ? ` (${category.name})` : ""}.`);
}

async function sendOpenSplits(chatId: number) {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("split_claim_status")
    .select("id,label,amount_per_payer_ars,remaining_payers,expected_payers_count,created_at,calculated_status")
    .in("calculated_status", ["pending", "partially_paid"])
    .order("created_at", { ascending: false });

  if (!data?.length) {
    await sendTelegram(chatId, "No tenes splits abiertos.");
    return;
  }

  await sendTelegram(
    chatId,
    data.map((split) => `${split.label}: faltan ${split.remaining_payers}/${split.expected_payers_count} pagos de $${Number(split.amount_per_payer_ars).toLocaleString("es-AR")}`).join("\n"),
  );
}

async function showSplitChoices(chatId: number, movementId: string) {
  const supabase = serviceClient();
  const { data: splits } = await supabase
    .from("split_claim_status")
    .select("id,label,amount_per_payer_ars,remaining_payers,calculated_status")
    .in("calculated_status", ["pending", "partially_paid"])
    .order("created_at", { ascending: false })
    .limit(8);

  if (!splits?.length) {
    await sendTelegram(chatId, "No hay splits abiertos. Lo dejo como entrada pendiente en la web.");
    return;
  }

  await sendTelegramWithKeyboard(
    chatId,
    "¿A que split corresponde?",
    splits.map((split) => [{
      text: `${split.label} · $${Number(split.amount_per_payer_ars).toLocaleString("es-AR")} · faltan ${split.remaining_payers}`,
      callback_data: `mp:${movementId}:split:${split.id}`,
    }]),
  );
}

async function resolveSuggestedSplit(chatId: number, movementId: string) {
  const supabase = serviceClient();
  const { data: movement } = await supabase
    .from("mp_movements")
    .select("suggested_split_id")
    .eq("id", movementId)
    .single();

  if (!movement?.suggested_split_id) {
    await showSplitChoices(chatId, movementId);
    return;
  }

  await resolveSplit(chatId, movementId, movement.suggested_split_id);
}

async function resolveSplit(chatId: number, movementId: string, splitId: string) {
  const supabase = serviceClient();
  const { data: movement } = await supabase
    .from("mp_movements")
    .select("amount_ars")
    .eq("id", movementId)
    .single();

  const { data: repayment, error } = await supabase
    .from("split_repayments")
    .insert({
      split_claim_id: splitId,
      payer_count: 1,
      amount_ars: movement?.amount_ars ?? 0,
      payment_method: "mp",
      source: "mp_report",
      mp_movement_id: movementId,
    })
    .select()
    .single();

  if (error) {
    await sendTelegram(chatId, `No pude registrar ese pago: ${error.message}`);
    return;
  }

  await supabase
    .from("mp_movements")
    .update({
      match_status: "matched_split",
      review_status: "resolved",
      matched_split_repayment_id: repayment.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", movementId);

  await sendTelegram(chatId, "Listo, lo marque como pago de split.");
  await askNextMovementForReview(chatId);
}

async function resolveIncome(chatId: number, movementId: string, description: string) {
  const supabase = serviceClient();
  const { data: movement } = await supabase
    .from("mp_movements")
    .select("amount_ars,occurred_at,description")
    .eq("id", movementId)
    .single();
  const { data: wallet } = await supabase.from("wallets").select("id").eq("name", "mp").single();

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      amount_ars: movement?.amount_ars ?? 0,
      occurred_at: movement?.occurred_at ?? new Date().toISOString(),
      wallet_id: wallet?.id,
      kind: "income",
      merchant: movement?.description ?? "Ingreso MP",
      description,
      source: "mp_report",
      source_movement_id: movementId,
    })
    .select()
    .single();

  if (error) {
    await sendTelegram(chatId, `No pude registrar el ingreso: ${error.message}`);
    return;
  }

  await supabase
    .from("mp_movements")
    .update({
      match_status: "matched_income",
      review_status: "resolved",
      matched_transaction_id: transaction.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", movementId);

  await sendTelegram(chatId, `Listo, registrado como ${description.toLowerCase()}.`);
  await askNextMovementForReview(chatId);
}

async function resolveIgnored(chatId: number, movementId: string) {
  const supabase = serviceClient();
  await supabase
    .from("mp_movements")
    .update({
      match_status: "ignored",
      review_status: "resolved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", movementId);

  await sendTelegram(chatId, "Ok, lo descarte.");
  await askNextMovementForReview(chatId);
}

async function askNextMovementForReview(chatId: number) {
  const supabase = serviceClient();
  const { data: movement } = await supabase
    .from("mp_movements")
    .select("id,amount_ars,occurred_at,description,suggested_split_id")
    .eq("direction", "in")
    .eq("review_status", "needs_review")
    .order("occurred_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!movement) {
    await sendTelegram(chatId, "No quedan entradas MP pendientes.");
    return;
  }

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

  const sent = await sendTelegramWithKeyboard(
    chatId,
    `Entro plata por MP: $${amount}\n${movement.description ?? "Movimiento MP"} · ${when}\n\n¿Que es?`,
    keyboard,
  );

  await supabase
    .from("mp_movements")
    .update({ review_status: "asked", telegram_message_id: sent.result?.message_id })
    .eq("id", movement.id);
}

async function sendWalletBalance(chatId: number) {
  const supabase = serviceClient();
  const { data } = await supabase.from("wallet_balances").select("name,balance_ars");
  const message = data?.map((wallet) => `${wallet.name.toUpperCase()}: $${Number(wallet.balance_ars).toLocaleString("es-AR")}`).join("\n") ?? "Sin saldos.";
  await sendTelegram(chatId, message);
}

async function sendTelegram(chatId: number, text: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function sendTelegramWithKeyboard(chatId: number, text: string, inlineKeyboard: Array<Array<{ text: string; callback_data: string }>>) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: { inline_keyboard: inlineKeyboard } }),
  });
  return response.json();
}

async function answerCallback(callbackQueryId: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}
