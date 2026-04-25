import { AlertTriangle, CheckCircle2, GitPullRequestArrow, Inbox, Search } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { inbox, movements, splits } from "@/lib/demo-data";
import { money, shortDate } from "@/lib/utils";

export default function InboxPage() {
  const reviewInbox = inbox.filter((item) => item.status === "pending" || item.status === "parse_failed");
  const unmatched = movements.filter((movement) => movement.matchStatus === "unmatched");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox de revision</h1>
        <p className="mt-1 text-sm text-stone-600">Mails que Telegram no cerro y entradas MP sin asociar.</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>mp_inbox</CardTitle>
            <Inbox size={18} className="text-stone-500" />
          </div>
          <div className="mt-4 space-y-3">
            {reviewInbox.map((item) => (
              <div key={item.id} className="rounded-lg border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.parsedMerchant}</p>
                    <p className="mt-1 text-xs text-stone-500">{item.detectedType} · {shortDate(item.receivedAt)}</p>
                  </div>
                  <strong>{money(item.parsedAmountArs)}</strong>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#10231c] px-3 text-sm font-medium text-white"><CheckCircle2 size={16} /> Confirmar</button>
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm font-medium"><Search size={16} /> Reparsear</button>
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm font-medium"><AlertTriangle size={16} /> Descartar</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Entradas MP sin asociar</CardTitle>
            <GitPullRequestArrow size={18} className="text-stone-500" />
          </div>
          <div className="mt-4 space-y-3">
            {unmatched.map((movement) => (
              <div key={movement.id} className="rounded-lg border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{movement.description}</p>
                  <p className="mt-1 text-xs text-stone-500">{shortDate(movement.occurredAt)} · {movement.reviewStatus === "asked" ? "preguntado por Telegram" : "pendiente de preguntar"}</p>
                  </div>
                  <strong>{money(movement.amountArs)}</strong>
                </div>
                <select className="mt-4 h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm outline-none">
                  <option>Elegir destino</option>
                  <option>Mensualidad</option>
                  <option>Otro ingreso</option>
                  {splits.map((split) => <option key={split.id}>Pago de split: {split.label}</option>)}
                  <option>Descartar</option>
                </select>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
