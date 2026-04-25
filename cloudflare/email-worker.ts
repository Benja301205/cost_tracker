export interface Env {
  SUPABASE_EMAIL_INGEST_URL: string;
  EMAIL_INGEST_SECRET: string;
}

const worker = {
  async email(message: ForwardableEmailMessage, env: Env) {
    const from = message.from.toLowerCase();
    if (!from.includes("notificaciones@mercadopago.com")) return;

    const raw = await new Response(message.raw).text();
    await fetch(env.SUPABASE_EMAIL_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-secret": env.EMAIL_INGEST_SECRET,
      },
      body: JSON.stringify({
        rawHtml: raw,
        receivedAt: new Date().toISOString(),
      }),
    });
  },
};

export default worker;
