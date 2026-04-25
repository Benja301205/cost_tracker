export type OpenSplitForMatch = {
  id: string;
  label: string;
  amount_per_payer_ars: number;
  created_at: string;
  status: "pending" | "partially_paid";
};

export type IncomingMovementForMatch = {
  id: string;
  amount_ars: number;
  occurred_at: string;
};

export function findSplitMatches(
  movement: IncomingMovementForMatch,
  splits: OpenSplitForMatch[],
  tolerance = 0.02,
) {
  const occurred = new Date(movement.occurred_at).getTime();

  return splits
    .filter((split) => {
      const created = new Date(split.created_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const inWindow = occurred >= created && occurred <= created + sevenDays;
      const delta = Math.abs(movement.amount_ars - split.amount_per_payer_ars);
      const amountOk = delta <= split.amount_per_payer_ars * tolerance;
      return inWindow && amountOk;
    })
    .sort((a, b) => Math.abs(movement.amount_ars - a.amount_per_payer_ars) - Math.abs(movement.amount_ars - b.amount_per_payer_ars));
}
