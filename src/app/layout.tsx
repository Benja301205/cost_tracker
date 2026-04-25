import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gastos de Benja",
  description: "Tracking personal de gastos, Mercado Pago, efectivo y splits.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Gastos",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="antialiased">
      <body>
        <ServiceWorkerRegister />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
