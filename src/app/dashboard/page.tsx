import { AlertCircle, ArrowDownUp, Banknote, CheckCircle2, Clock3, HandCoins, WalletCards } from "lucide-react";
import { CategoryPie, MonthlyBars } from "@/components/dashboard-charts";
import { Card, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { money, shortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type TransactionRow = {
  id: string;
  amount_ars: number | string;
  occurred_at: string;
  kind: "expense" | "income" | "transfer";
  merchant: string | null;
  description: string | null;
  category_id: string | null;
  wallet_id: string | null;
  categoryName: string | null;
  walletName: "mp" | "cash" | null;
};

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const data = await loadDashboardData(monthStart);

  const categories = data.categories;
  const transactions = data.transactions.map((transaction) => ({
    ...transaction,
    categoryName: data.categoryNamesById.get(transaction.category_id ?? "") ?? null,
    walletName: data.walletNamesById.get(transaction.wallet_id ?? "") ?? null,
  }));
  const walletBalances = data.walletBalances;
  const splits = data.splits;
  const repayments = data.repayments;

  const monthExpenses = transactions
    .filter((item) => item.kind === "expense")
    .reduce((sum, item) => sum + Number(item.amount_ars), 0);
  const grossOpenSplits = splits
    .filter((split) => split.calculated_status !== "paid" && split.calculated_status !== "cancelled")
    .reduce((sum, split) => sum + Number(split.total_amount_ars), 0);
  const pendingSplitMoney = splits.reduce((sum, split) => sum + Number(split.pending_amount_ars), 0);
  const repaidThisMonth = repayments.reduce((sum, repayment) => sum + Number(repayment.amount_ars), 0);
  const unmatchedCount = data.unmatchedCount;
  const inboxCount = data.inboxCount;
  const walletMp = Number(walletBalances.find((wallet) => wallet.name === "mp")?.balance_ars ?? 0);
  const walletCash = Number(walletBalances.find((wallet) => wallet.name === "cash")?.balance_ars ?? 0);
  const categoryData = categories
    .map((category) => ({
      name: category.name,
      total: transactions
        .filter((transaction) => transaction.kind === "expense" && transaction.categoryName === category.name)
        .reduce((sum, transaction) => sum + Number(transaction.amount_ars), 0),
    }))
    .filter((item) => item.total > 0);
  const monthlyBars = buildMonthlyBars(transactions);

  const cards = [
    { label: "Gastos reales del mes", value: money(monthExpenses), icon: WalletCards, note: "post-split" },
    { label: "Pagaste para dividir", value: money(grossOpenSplits), icon: HandCoins, note: "bruto abierto" },
    { label: "Te falta que te pasen", value: money(pendingSplitMoney), icon: Clock3, note: "pendiente" },
    { label: "Ya te devolvieron", value: money(repaidThisMonth), icon: CheckCircle2, note: "este mes" },
    { label: "Entradas MP sin asociar", value: String(unmatchedCount), icon: AlertCircle, note: "para revisar" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-600">Resumen mensual con gastos reales, splits y conciliacion asistida.</p>
        {data.error ? <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{data.error}</p> : null}
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="min-h-32">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-stone-500">{item.label}</p>
                <Icon className="text-stone-500" size={20} />
              </div>
              <p className="mt-4 text-2xl font-semibold text-stone-950">{item.value}</p>
              <p className="mt-1 text-xs text-stone-500">{item.note}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Gastos por rubro</CardTitle>
            <span className="text-xs text-stone-500">Mes actual</span>
          </div>
          {categoryData.length ? <CategoryPie data={categoryData} /> : <EmptyChart label="Todavia no hay gastos cargados este mes" />}
          <div className="space-y-2">
            {categoryData.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-stone-600">{item.name}</span>
                <strong>{money(item.total)}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Ultimos 6 meses</CardTitle>
          <MonthlyBars data={monthlyBars} />
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardTitle>MP vs efectivo</CardTitle>
          <div className="mt-5 grid gap-3">
            <div className="rounded-lg bg-[#10231c] p-4 text-white">
              <div className="flex items-center gap-2 text-sm"><ArrowDownUp size={16} /> Mercado Pago</div>
              <p className="mt-3 text-2xl font-semibold">{money(walletMp)}</p>
            </div>
            <div className="rounded-lg bg-[#d7f36d] p-4 text-stone-950">
              <div className="flex items-center gap-2 text-sm"><Banknote size={16} /> Efectivo</div>
              <p className="mt-3 text-2xl font-semibold">{money(walletCash)}</p>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <CardTitle>Ultimos gastos</CardTitle>
            <span className="text-xs text-stone-500">{inboxCount} pendientes en inbox</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
            {transactions.filter((item) => item.kind === "expense").slice(0, 6).map((transaction) => (
                <div key={transaction.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-stone-100 p-3 last:border-0 md:grid-cols-[120px_1fr_auto]">
                  <span className="hidden text-sm text-stone-500 md:block">{shortDate(transaction.occurred_at)}</span>
                  <div>
                    <p className="text-sm font-medium">{transaction.merchant ?? transaction.description ?? "Movimiento"}</p>
                    <p className="text-xs text-stone-500">{transaction.categoryName ?? "Sin rubro"} · {(transaction.walletName ?? "-").toUpperCase()}</p>
                  </div>
                  <strong className="text-sm">{money(Number(transaction.amount_ars))}</strong>
                </div>
            ))}
            {!transactions.some((item) => item.kind === "expense") ? (
              <div className="p-6 text-sm text-stone-500">Sin gastos todavia. Cargá uno desde Telegram o desde Cargar.</div>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}

async function loadDashboardData(monthStart: string) {
  try {
    const supabase = createServerSupabaseClient();
    const [
      categoriesResult,
      transactionsResult,
      walletResult,
      walletsResult,
      splitResult,
      repaymentResult,
      movementResult,
      inboxResult,
    ] = await Promise.all([
      supabase.from("categories").select("id,name,sort_order").order("sort_order"),
      supabase
        .from("transactions")
        .select("id,amount_ars,occurred_at,kind,merchant,description,category_id,wallet_id")
        .gte("occurred_at", monthStart)
        .order("occurred_at", { ascending: false })
        .limit(80),
      supabase.from("wallet_balances").select("name,balance_ars"),
      supabase.from("wallets").select("id,name"),
      supabase.from("split_claim_status").select("total_amount_ars,pending_amount_ars,calculated_status"),
      supabase.from("split_repayments").select("amount_ars,created_at").gte("created_at", monthStart),
      supabase.from("mp_movements").select("id").eq("match_status", "unmatched").eq("direction", "in"),
      supabase.from("mp_inbox").select("id").in("status", ["pending", "parse_failed"]),
    ]);

    const firstError = [
      categoriesResult.error,
      transactionsResult.error,
      walletResult.error,
      walletsResult.error,
      splitResult.error,
      repaymentResult.error,
      movementResult.error,
      inboxResult.error,
    ].find(Boolean);

    return {
      categories: categoriesResult.data ?? [],
      transactions: (transactionsResult.data ?? []) as Array<Omit<TransactionRow, "categoryName" | "walletName">>,
      categoryNamesById: new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name])),
      walletBalances: walletResult.data ?? [],
      walletNamesById: new Map((walletsResult.data ?? []).map((wallet) => [wallet.id, wallet.name as "mp" | "cash"])),
      splits: splitResult.data ?? [],
      repayments: repaymentResult.data ?? [],
      unmatchedCount: movementResult.data?.length ?? 0,
      inboxCount: inboxResult.data?.length ?? 0,
      error: firstError ? `Supabase: ${firstError.message}` : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo conectar con Supabase";
    return {
      categories: [],
      transactions: [],
      categoryNamesById: new Map<string, string>(),
      walletBalances: [],
      walletNamesById: new Map<string, "mp" | "cash">(),
      splits: [],
      repayments: [],
      unmatchedCount: 0,
      inboxCount: 0,
      error: message,
    };
  }
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-72 items-center justify-center rounded-lg bg-stone-50 text-sm text-stone-500">{label}</div>;
}

function buildMonthlyBars(transactions: TransactionRow[]) {
  const formatter = new Intl.DateTimeFormat("es-AR", { month: "short" });
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: formatter.format(date),
      ingresos: 0,
      gastos: 0,
    };
  });

  for (const transaction of transactions) {
    const date = new Date(transaction.occurred_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = months.find((month) => month.key === key);
    if (!bucket) continue;
    if (transaction.kind === "income") bucket.ingresos += Number(transaction.amount_ars);
    if (transaction.kind === "expense") bucket.gastos += Number(transaction.amount_ars);
  }

  return months;
}
