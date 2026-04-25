import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Banknote, Calendar, CircleDollarSign, Save, WalletCards } from "lucide-react";
import { Card, Label } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function createManualTransaction(formData: FormData) {
  "use server";

  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const categoryId = String(formData.get("category_id") ?? "");
  const walletName = String(formData.get("wallet") ?? "cash");
  const kind = String(formData.get("kind") ?? "expense");
  const occurredAt = String(formData.get("occurred_at") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!amount || amount <= 0) return;

  const supabase = createServerSupabaseClient();
  const { data: wallet } = await supabase.from("wallets").select("id").eq("name", walletName).single();

  await supabase.from("transactions").insert({
    amount_ars: amount,
    occurred_at: occurredAt ? new Date(`${occurredAt}T12:00:00-03:00`).toISOString() : new Date().toISOString(),
    category_id: categoryId || null,
    wallet_id: wallet?.id,
    kind,
    merchant: description || (kind === "income" ? "Ingreso manual" : "Gasto manual"),
    description,
    source: "web",
  });

  revalidatePath("/dashboard");
  revalidatePath("/manual");
  redirect("/dashboard");
}

export default async function ManualPage() {
  const supabase = createServerSupabaseClient();
  const { data: categories } = await supabase.from("categories").select("id,name,sort_order").eq("is_active", true).order("sort_order");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cargar movimiento</h1>
        <p className="mt-1 text-sm text-stone-600">Gastos, ingresos y ajustes simples desde la web.</p>
      </div>

      <Card>
        <form action={createManualTransaction} className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Monto</Label>
            <div className="flex h-12 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3">
              <CircleDollarSign size={18} className="text-stone-500" />
              <input className="w-full outline-none" name="amount" placeholder="1500" inputMode="decimal" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <div className="flex h-12 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3">
              <Calendar size={18} className="text-stone-500" />
              <input className="w-full outline-none" name="occurred_at" type="date" defaultValue={today} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Billetera</Label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white text-sm font-medium has-[:checked]:border-[#10231c] has-[:checked]:bg-[#10231c] has-[:checked]:text-white">
                <input className="sr-only" type="radio" name="wallet" value="mp" />
                <WalletCards size={18} /> MP
              </label>
              <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white text-sm font-medium has-[:checked]:border-[#10231c] has-[:checked]:bg-[#10231c] has-[:checked]:text-white">
                <input className="sr-only" type="radio" name="wallet" value="cash" defaultChecked />
                <Banknote size={18} /> Efectivo
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <select className="h-12 w-full rounded-lg border border-stone-200 bg-white px-3 outline-none" name="kind" defaultValue="expense">
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Rubro</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(categories ?? []).map((category, index) => (
                <label key={category.id} className="min-h-11 cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-3 text-left text-sm font-medium hover:border-[#10231c] has-[:checked]:border-[#10231c] has-[:checked]:bg-[#eef7ce]">
                  <input className="sr-only" type="radio" name="category_id" value={category.id} defaultChecked={index === 0} />
                  {category.name}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripcion</Label>
            <input className="h-12 w-full rounded-lg border border-stone-200 bg-white px-3 outline-none" name="description" placeholder="nafta YPF, pizza, mensualidad..." />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#10231c] text-sm font-semibold text-white md:col-span-2" type="submit">
            <Save size={18} /> Guardar movimiento
          </button>
        </form>
      </Card>
    </div>
  );
}
