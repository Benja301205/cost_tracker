import { AlertCircle, ArrowDownUp, Banknote, CheckCircle2, Clock3, HandCoins, WalletCards } from "lucide-react";
import { CategoryPie, MonthlyBars } from "@/components/dashboard-charts";
import { Card, CardTitle } from "@/components/ui/card";
import { categories, inbox, movements, repayments, splits, transactions } from "@/lib/demo-data";
import { monthSpendByCategory, splitProgress } from "@/lib/domain";
import { money, shortDate } from "@/lib/utils";

export default function DashboardPage() {
  const categoryData = monthSpendByCategory(transactions, categories);
  const monthExpenses = transactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amountArs, 0);
  const grossOpenSplits = splits.filter((split) => split.status !== "paid" && split.status !== "cancelled").reduce((sum, split) => sum + split.totalAmountArs, 0);
  const pendingSplitMoney = splits.reduce((sum, split) => sum + splitProgress(split, repayments).pendingAmount, 0);
  const repaidThisMonth = repayments.reduce((sum, repayment) => sum + repayment.amountArs, 0);
  const unmatchedCount = movements.filter((movement) => movement.matchStatus === "unmatched").length;
  const walletMp = transactions.reduce((sum, transaction) => transaction.wallet === "mp" ? sum + (transaction.kind === "income" ? transaction.amountArs : -transaction.amountArs) : sum, 0);
  const walletCash = transactions.reduce((sum, transaction) => transaction.wallet === "cash" ? sum + (transaction.kind === "income" ? transaction.amountArs : -transaction.amountArs) : sum, 0);

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
            <span className="text-xs text-stone-500">Abril</span>
          </div>
          <CategoryPie data={categoryData} />
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
          <MonthlyBars />
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
            <span className="text-xs text-stone-500">{inbox.length} pendientes en inbox</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
            {transactions.filter((item) => item.kind === "expense").slice(0, 6).map((transaction) => {
              const category = categories.find((item) => item.id === transaction.categoryId);
              return (
                <div key={transaction.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-stone-100 p-3 last:border-0 md:grid-cols-[120px_1fr_auto]">
                  <span className="hidden text-sm text-stone-500 md:block">{shortDate(transaction.occurredAt)}</span>
                  <div>
                    <p className="text-sm font-medium">{transaction.merchant}</p>
                    <p className="text-xs text-stone-500">{category?.name} · {transaction.wallet.toUpperCase()}</p>
                  </div>
                  <strong className="text-sm">{money(transaction.amountArs)}</strong>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
