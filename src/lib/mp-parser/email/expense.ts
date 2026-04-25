export type ParsedMpExpenseEmail = {
  detectedType: "expense" | "transfer_sent" | "unknown";
  amountArs?: number;
  merchant?: string;
  occurredAt?: string;
};

export function parseMpExpenseEmail(rawHtml: string): ParsedMpExpenseEmail {
  const text = htmlToText(rawHtml);
  const amountMatch = text.match(/\$\s?([\d.]+(?:,\d{1,2})?)/);
  const amountArs = amountMatch ? parseArs(amountMatch[1]) : undefined;
  const transferSent = /transferiste|enviaste dinero|transferencia enviada/i.test(text);
  const payment = /pagaste|pago|compra|recarga/i.test(text);
  const merchant =
    extractAfter(text, /(?:a|en)\s+([A-Z0-9 ._-]{3,50})(?:\s+por|\s+\$|$)/i) ??
    extractAfter(text, /Comercio\s+([A-Z0-9 ._-]{3,50})/i);

  return {
    detectedType: transferSent ? "transfer_sent" : payment ? "expense" : "unknown",
    amountArs,
    merchant: merchant?.trim(),
    occurredAt: new Date().toISOString(),
  };
}

function htmlToText(rawHtml: string) {
  return rawHtml
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArs(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function extractAfter(text: string, regex: RegExp) {
  return text.match(regex)?.[1];
}
