import { parseMpExpenseEmail } from "./expense";

export function parseMpTransferSentEmail(rawHtml: string) {
  const parsed = parseMpExpenseEmail(rawHtml);
  return {
    ...parsed,
    detectedType: "transfer_sent" as const,
  };
}
