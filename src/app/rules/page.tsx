import { Archive, Play, Plus, Save, SlidersHorizontal } from "lucide-react";
import { Card, CardTitle, Label } from "@/components/ui/card";
import { categories } from "@/lib/demo-data";

const expenseRules = [
  ["^SUBE$ o RECARGA SUBE", "auto_confirm", "Transporte publico"],
  ["SPOTIFY", "auto_confirm", "Suscripciones"],
  ["NETFLIX", "auto_confirm", "Suscripciones"],
  ["DISNEY", "auto_confirm", "Suscripciones"],
  ["HBO, MAX", "auto_confirm", "Suscripciones"],
  ["UBER, DIDI, CABIFY", "auto_confirm", "Apps de viaje"],
];

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reglas y categorias</h1>
        <p className="mt-1 text-sm text-stone-600">Auto-confirmacion prudente, editable antes de activar cambios fuertes.</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Auto-reglas activas</CardTitle>
            <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#10231c] px-3 text-sm font-medium text-white"><Plus size={16} /> Nueva</button>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
            {expenseRules.map((rule) => (
              <div key={rule[0]} className="grid gap-3 border-b border-stone-100 p-3 last:border-0 md:grid-cols-[1fr_140px_180px_auto] md:items-center">
                <code className="text-sm">{rule[0]}</code>
                <span className="text-sm text-stone-600">{rule[1]}</span>
                <span className="text-sm font-medium">{rule[2]}</span>
                <button className="flex size-9 items-center justify-center rounded-lg border border-stone-200" aria-label="Archivar"><Archive size={16} /></button>
              </div>
            ))}
            <div className="grid gap-3 border-b border-stone-100 p-3 last:border-0 md:grid-cols-[1fr_140px_180px_auto] md:items-center">
              <code className="text-sm">GUADALUPE EMILIANA CELI / 23390910304</code>
              <span className="text-sm text-stone-600">auto_confirm</span>
              <span className="text-sm font-medium">Mensualidad</span>
              <button className="flex size-9 items-center justify-center rounded-lg border border-stone-200" aria-label="Archivar"><Archive size={16} /></button>
            </div>
          </div>
          <button className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium">
            <Play size={16} /> Probar regla contra inbox historico
          </button>
        </Card>

        <Card>
          <CardTitle>Categorias</CardTitle>
          <div className="mt-4 space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2">
                <span className="text-sm font-medium">{category.name}</span>
                <input type="checkbox" defaultChecked={category.isActive} className="size-4 accent-[#10231c]" />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} />
          <CardTitle>Editor rapido</CardTitle>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Aplica a</Label>
            <select className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3"><option>Gasto</option><option>Ingreso</option></select>
          </div>
          <div className="space-y-2">
            <Label>Regex</Label>
            <input className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3" placeholder="CARREFOUR|DIA" />
          </div>
          <div className="space-y-2">
            <Label>Accion</Label>
            <select className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3"><option>pending</option><option>auto_confirm</option><option>auto_discard</option></select>
          </div>
        </div>
        <button className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#10231c] px-3 text-sm font-semibold text-white"><Save size={16} /> Guardar regla</button>
      </Card>
    </div>
  );
}
