"use client";

import { useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/utils";

const colors = ["#10231c", "#d7f36d", "#2f7d68", "#f2b84b", "#ef6f6c", "#6c7ae0", "#8c6a48"];

export function CategoryPie({ data }: { data: { name: string; total: number }[] }) {
  const mounted = useMounted();
  if (!mounted) return <div className="h-72" />;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => money(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyBars({ data }: { data: { month: string; ingresos: number; gastos: number }[] }) {
  const mounted = useMounted();
  if (!mounted) return <div className="h-72" />;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
          <Tooltip formatter={(value) => money(Number(value))} />
          <Bar dataKey="ingresos" fill="#d7f36d" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gastos" fill="#10231c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function useMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
