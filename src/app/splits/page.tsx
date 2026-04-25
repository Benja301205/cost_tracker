import { Check, Clock3, Minus, Plus, RotateCcw, X } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { repayments, splits } from "@/lib/demo-data";
import { splitProgress } from "@/lib/domain";
import { money, shortDate } from "@/lib/utils";

const statusCopy = {
  pending: "Pendiente",
  partially_paid: "Parcial",
  paid: "Pagado",
  cancelled: "Cancelado",
};

export default function SplitsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Splits</h1>
        <p className="mt-1 text-sm text-stone-600">Pagos abiertos, parciales y correcciones manuales.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {splits.map((split) => {
          const progress = splitProgress(split, repayments);
          return (
            <Card key={split.id} className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{split.label}</h2>
                  <p className="mt-1 text-xs text-stone-500">{shortDate(split.createdAt)} · entre {split.peopleCount}</p>
                </div>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">{statusCopy[progress.status]}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">Total</p>
                  <p className="mt-1 font-semibold">{money(split.totalAmountArs)}</p>
                </div>
                <div className="rounded-lg bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">Tu parte</p>
                  <p className="mt-1 font-semibold">{money(split.yourShareArs)}</p>
                </div>
                <div className="rounded-lg bg-[#fff5d7] p-3">
                  <p className="text-xs text-stone-500">Falta</p>
                  <p className="mt-1 font-semibold">{money(progress.pendingAmount)}</p>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
                  <span>{progress.paidPayers}/{split.expectedPayersCount} pagos cobrados</span>
                  <span>{progress.remainingPayers} faltan</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100">
                  <div className="h-2 rounded-full bg-[#10231c]" style={{ width: `${(progress.paidPayers / split.expectedPayersCount) * 100}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button className="flex h-10 items-center justify-center rounded-lg bg-[#10231c] text-white" aria-label="Sumar pago"><Plus size={17} /></button>
                <button className="flex h-10 items-center justify-center rounded-lg border border-stone-200 bg-white" aria-label="Restar pago"><Minus size={17} /></button>
                <button className="flex h-10 items-center justify-center rounded-lg border border-stone-200 bg-white" aria-label="Reabrir"><RotateCcw size={17} /></button>
                <button className="flex h-10 items-center justify-center rounded-lg border border-stone-200 bg-white" aria-label="Cancelar"><X size={17} /></button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardTitle>Pagos cargados</CardTitle>
        <div className="mt-4 divide-y divide-stone-100">
          {repayments.map((repayment) => {
            const split = splits.find((item) => item.id === repayment.splitClaimId);
            return (
              <div key={repayment.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#d7f36d]"><Check size={17} /></div>
                  <div>
                    <p className="text-sm font-medium">{split?.label}</p>
                    <p className="text-xs text-stone-500">{repayment.payerCount} pagos · {repayment.paymentMethod}</p>
                  </div>
                </div>
                <strong className="text-sm">{money(repayment.amountArs)}</strong>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="flex items-center gap-3 border-[#f2b84b]/50 bg-[#fff8e6]">
        <Clock3 size={20} />
        <p className="text-sm text-stone-700">Los recordatorios siguen la cadencia 24h, 3 dias, 7 dias y luego silencio.</p>
      </Card>
    </div>
  );
}
