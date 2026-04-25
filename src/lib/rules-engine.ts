export type AutoRule = {
  id: string;
  applies_to: "expense" | "income";
  match_merchant_regex?: string | null;
  match_amount_min?: number | null;
  match_amount_max?: number | null;
  match_sender_name_regex?: string | null;
  match_sender_cuil?: string | null;
  action: "auto_confirm" | "auto_discard" | "pending";
  default_category_id?: string | null;
  income_type?: "mensualidad" | "split_refund" | "other" | null;
  enabled: boolean;
  sort_order: number;
};

export type ExpenseRuleInput = {
  merchant: string;
  amountArs: number;
};

export type IncomeRuleInput = {
  senderName?: string | null;
  senderCuil?: string | null;
  amountArs: number;
};

export function matchExpenseRule(rules: AutoRule[], input: ExpenseRuleInput) {
  return ordered(rules)
    .filter((rule) => rule.enabled && rule.applies_to === "expense")
    .find((rule) => {
      const merchantOk = rule.match_merchant_regex
        ? new RegExp(rule.match_merchant_regex, "i").test(input.merchant)
        : true;
      const minOk = rule.match_amount_min == null || input.amountArs >= rule.match_amount_min;
      const maxOk = rule.match_amount_max == null || input.amountArs <= rule.match_amount_max;
      return merchantOk && minOk && maxOk;
    });
}

export function matchIncomeRule(rules: AutoRule[], input: IncomeRuleInput) {
  return ordered(rules)
    .filter((rule) => rule.enabled && rule.applies_to === "income")
    .find((rule) => {
      const nameOk = rule.match_sender_name_regex
        ? new RegExp(rule.match_sender_name_regex, "i").test(input.senderName ?? "")
        : false;
      const cuilOk = rule.match_sender_cuil ? rule.match_sender_cuil === input.senderCuil : false;
      const minOk = rule.match_amount_min == null || input.amountArs >= rule.match_amount_min;
      const maxOk = rule.match_amount_max == null || input.amountArs <= rule.match_amount_max;
      return (nameOk || cuilOk) && minOk && maxOk;
    });
}

function ordered(rules: AutoRule[]) {
  return [...rules].sort((a, b) => a.sort_order - b.sort_order);
}
