import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <section className={cn("rounded-lg border border-stone-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </section>
  );
}

export function CardTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return <h2 className="text-sm font-semibold text-stone-950">{children}</h2>;
}

export function Label({ children }: Readonly<{ children: React.ReactNode }>) {
  return <label className="text-xs font-medium uppercase tracking-wide text-stone-500">{children}</label>;
}
