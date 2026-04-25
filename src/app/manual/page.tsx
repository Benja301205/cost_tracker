import { Banknote, Calendar, CircleDollarSign, Save, Split, WalletCards } from "lucide-react";
import { Card, Label } from "@/components/ui/card";
import { categories } from "@/lib/demo-data";

export default function ManualPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cargar manual</h1>
        <p className="mt-1 text-sm text-stone-600">Para efectivo, ingresos a mano y gastos que no vinieron por mail.</p>
      </div>

      <Card>
        <form className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Monto</Label>
            <div className="flex h-12 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3">
              <CircleDollarSign size={18} className="text-stone-500" />
              <input className="w-full outline-none" placeholder="1500" inputMode="decimal" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <div className="flex h-12 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3">
              <Calendar size={18} className="text-stone-500" />
              <input className="w-full outline-none" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Wallet</Label>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#10231c] text-sm font-medium text-white" type="button"><WalletCards size={18} /> MP</button>
              <button className="flex h-12 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white text-sm font-medium" type="button"><Banknote size={18} /> Efectivo</button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <select className="h-12 w-full rounded-lg border border-stone-200 bg-white px-3 outline-none">
              <option>Gasto</option>
              <option>Ingreso</option>
              <option>Transferencia entre wallets</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Rubro</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <button key={category.id} className="min-h-11 rounded-lg border border-stone-200 bg-white px-3 text-left text-sm font-medium hover:border-[#10231c]" type="button">
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripcion</Label>
            <input className="h-12 w-full rounded-lg border border-stone-200 bg-white px-3 outline-none" placeholder="nafta YPF, pizza, mensualidad..." />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 p-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <Split size={20} />
              <div>
                <p className="text-sm font-medium">Es split</p>
                <p className="text-xs text-stone-500">Registra solo tu parte y crea deuda a cobrar.</p>
              </div>
            </div>
            <input className="size-5 accent-[#10231c]" type="checkbox" />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#10231c] text-sm font-semibold text-white md:col-span-2" type="button">
            <Save size={18} /> Guardar movimiento
          </button>
        </form>
      </Card>
    </div>
  );
}
