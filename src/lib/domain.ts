export type Wallet = "mp" | "cash";
export type TransactionKind = "expense" | "income" | "transfer";
export type SplitStatus = "pending" | "partially_paid" | "paid" | "cancelled";

export type Category = {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

export type Transaction = {
  id: string;
  amountArs: number;
  occurredAt: string;
  categoryId: string;
  wallet: Wallet;
  kind: TransactionKind;
  merchant: string;
  description?: string;
  source: "email" | "mp_report" | "telegram" | "web";
  splitClaimId?: string;
  splitTotalArs?: number;
};

export type SplitRepayment = {
  id: string;
  splitClaimId: string;
  payerCount: number;
  amountArs: number;
  paymentMethod: "mp" | "cash" | "other" | "manual";
  source: "telegram" | "mp_report" | "app";
  createdAt: string;
  note?: string;
};

export type SplitClaim = {
  id: string;
  sourceTransactionId: string;
  label: string;
  totalAmountArs: number;
  peopleCount: number;
  yourShareArs: number;
  expectedPayersCount: number;
  amountPerPayerArs: number;
  status: SplitStatus;
  remindAt?: string;
  createdAt: string;
  paidAt?: string;
};

export type MpInboxItem = {
  id: string;
  parsedAmountArs: number;
  parsedMerchant: string;
  receivedAt: string;
  detectedType: "expense" | "transfer_sent" | "unknown";
  status: "pending" | "confirmed" | "discarded" | "auto_confirmed" | "parse_failed";
};

export type MpMovement = {
  id: string;
  direction: "in" | "out";
  amountArs: number;
  occurredAt: string;
  description: string;
  matchStatus: "unmatched" | "matched_split" | "matched_income" | "ignored";
  reviewStatus?: "not_needed" | "needs_review" | "asked" | "resolved";
};

export function splitProgress(split: SplitClaim, repayments: SplitRepayment[]) {
  const paidPayers = repayments
    .filter((repayment) => repayment.splitClaimId === split.id)
    .reduce((total, repayment) => total + repayment.payerCount, 0);
  const remainingPayers = Math.max(split.expectedPayersCount - paidPayers, 0);
  const pendingAmount = remainingPayers * split.amountPerPayerArs;
  const status: SplitStatus =
    remainingPayers === 0 ? "paid" : paidPayers > 0 ? "partially_paid" : "pending";

  return { paidPayers, remainingPayers, pendingAmount, status };
}

export function monthSpendByCategory(transactions: Transaction[], categories: Category[]) {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  return categories
    .map((category) => ({
      name: category.name,
      icon: category.icon,
      total: transactions
        .filter((transaction) => {
          const occurred = new Date(transaction.occurredAt);
          return (
            transaction.kind === "expense" &&
            transaction.categoryId === category.id &&
            occurred.getMonth() === month &&
            occurred.getFullYear() === year
          );
        })
        .reduce((sum, transaction) => sum + transaction.amountArs, 0),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}
