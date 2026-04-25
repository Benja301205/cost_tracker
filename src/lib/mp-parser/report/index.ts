export type MpReportRow = Record<string, string>;

export type ParsedMpMovement = {
  sourceId: string;
  movementType: "payment" | "transfer_sent" | "transfer_received" | "refund" | "withdrawal" | "unknown";
  direction: "in" | "out";
  amountArs: number;
  occurredAt: string;
  description: string;
  rawPayload: MpReportRow;
  senderName?: string;
  senderCuil?: string;
};

export function parseAccountMoneyReportCsv(csv: string) {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);
  return lines.filter(Boolean).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

export function parseMpReportRow(row: MpReportRow): ParsedMpMovement {
  const amount = Number(row.TRANSACTION_AMOUNT ?? row.transaction_amount ?? "0");
  const sourceId = row.SOURCE_ID ?? row.source_id ?? `${row.DATE}-${row.DESCRIPTION}-${amount}`;
  const description = row.DESCRIPTION ?? row.description ?? row.SENDER_NAME ?? "";

  return {
    sourceId,
    movementType: inferMovementType(row),
    direction: amount >= 0 ? "in" : "out",
    amountArs: Math.abs(amount),
    occurredAt: row.DATE ?? row.TRANSACTION_DATE ?? new Date().toISOString(),
    description,
    rawPayload: row,
    senderName: row.SENDER_NAME ?? row.sender_name,
    senderCuil: row.SENDER_IDENTIFICATION_NUMBER ?? row.sender_cuil,
  };
}

export function isRelevantIncomingReportRow(row: MpReportRow) {
  return (
    Number(row.TRANSACTION_AMOUNT ?? row.transaction_amount ?? "0") > 0 &&
    (row.TRANSACTION_TYPE ?? row.transaction_type) === "SETTLEMENT" &&
    (row.PAYMENT_METHOD_TYPE ?? row.payment_method_type) === "available_money"
  );
}

function inferMovementType(row: MpReportRow): ParsedMpMovement["movementType"] {
  const description = `${row.TRANSACTION_TYPE ?? ""} ${row.DESCRIPTION ?? ""}`.toLowerCase();
  if (description.includes("withdrawal")) return "withdrawal";
  if (description.includes("refund")) return "refund";
  if (Number(row.TRANSACTION_AMOUNT ?? "0") > 0) return "transfer_received";
  if (Number(row.TRANSACTION_AMOUNT ?? "0") < 0) return "payment";
  return "unknown";
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
    } else current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}
