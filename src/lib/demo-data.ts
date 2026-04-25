import type { Category, MpInboxItem, MpMovement, SplitClaim, SplitRepayment, Transaction } from "@/lib/domain";

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

export const categories: Category[] = [
  { id: "super", name: "Super", icon: "ShoppingBasket", sortOrder: 1, isActive: true },
  { id: "delivery", name: "Comida pedida", icon: "Pizza", sortOrder: 2, isActive: true },
  { id: "transporte", name: "Transporte publico", icon: "Bus", sortOrder: 3, isActive: true },
  { id: "apps", name: "Apps de viaje", icon: "Car", sortOrder: 4, isActive: true },
  { id: "nafta", name: "Nafta/estac./peajes", icon: "Fuel", sortOrder: 5, isActive: true },
  { id: "bares", name: "Bares y salidas", icon: "Beer", sortOrder: 6, isActive: true },
  { id: "regalos", name: "Regalos", icon: "Gift", sortOrder: 7, isActive: true },
  { id: "salud", name: "Salud", icon: "HeartPulse", sortOrder: 8, isActive: true },
  { id: "subs", name: "Suscripciones", icon: "MonitorPlay", sortOrder: 9, isActive: true },
  { id: "pelu", name: "Peluqueria/cuidado personal", icon: "Scissors", sortOrder: 10, isActive: true },
  { id: "retiro", name: "Retiro de efectivo", icon: "BanknoteArrowDown", sortOrder: 11, isActive: true },
  { id: "varios", name: "Varios", icon: "Package", sortOrder: 12, isActive: true },
];

export const transactions: Transaction[] = [
  { id: "t1", amountArs: 38700, occurredAt: daysAgo(1), categoryId: "super", wallet: "mp", kind: "expense", merchant: "Carrefour", source: "email" },
  { id: "t2", amountArs: 1125, occurredAt: daysAgo(0), categoryId: "super", wallet: "mp", kind: "expense", merchant: "Carrefour", source: "email", splitClaimId: "s1", splitTotalArs: 4500 },
  { id: "t3", amountArs: 24300, occurredAt: daysAgo(2), categoryId: "nafta", wallet: "cash", kind: "expense", merchant: "YPF", description: "Cargado por /efectivo", source: "telegram" },
  { id: "t4", amountArs: 8900, occurredAt: daysAgo(3), categoryId: "apps", wallet: "mp", kind: "expense", merchant: "Uber", source: "email" },
  { id: "t5", amountArs: 12500, occurredAt: daysAgo(4), categoryId: "bares", wallet: "mp", kind: "expense", merchant: "Pizza Telegram", source: "web", splitClaimId: "s2", splitTotalArs: 50000 },
  { id: "t6", amountArs: 850000, occurredAt: daysAgo(6), categoryId: "varios", wallet: "mp", kind: "income", merchant: "Guadalupe Emiliana Celi", description: "Mensualidad alquiler", source: "mp_report" },
  { id: "t7", amountArs: 1999, occurredAt: daysAgo(7), categoryId: "subs", wallet: "mp", kind: "expense", merchant: "Spotify", source: "email" },
];

export const splits: SplitClaim[] = [
  { id: "s1", sourceTransactionId: "t2", label: "Carrefour", totalAmountArs: 4500, peopleCount: 4, yourShareArs: 1125, expectedPayersCount: 3, amountPerPayerArs: 1125, status: "pending", remindAt: daysAgo(-1), createdAt: daysAgo(0) },
  { id: "s2", sourceTransactionId: "t5", label: "Pizza Telegram", totalAmountArs: 50000, peopleCount: 4, yourShareArs: 12500, expectedPayersCount: 3, amountPerPayerArs: 12500, status: "partially_paid", remindAt: daysAgo(-2), createdAt: daysAgo(4) },
  { id: "s3", sourceTransactionId: "t4", label: "Uber vuelta", totalAmountArs: 12000, peopleCount: 2, yourShareArs: 6000, expectedPayersCount: 1, amountPerPayerArs: 6000, status: "pending", remindAt: daysAgo(0), createdAt: daysAgo(2) },
];

export const repayments: SplitRepayment[] = [
  { id: "r1", splitClaimId: "s2", payerCount: 2, amountArs: 25000, paymentMethod: "cash", source: "telegram", createdAt: daysAgo(1), note: "Dos pagos juntos" },
];

export const inbox: MpInboxItem[] = [
  { id: "i1", parsedAmountArs: 7200, parsedMerchant: "Farmacity", receivedAt: daysAgo(0), detectedType: "expense", status: "pending" },
  { id: "i2", parsedAmountArs: 3100, parsedMerchant: "Formato nuevo MP", receivedAt: daysAgo(1), detectedType: "unknown", status: "parse_failed" },
];

export const movements: MpMovement[] = [
  { id: "m1", direction: "in", amountArs: 12500, occurredAt: daysAgo(0), description: "Transferencia recibida", matchStatus: "unmatched", reviewStatus: "needs_review" },
  { id: "m2", direction: "in", amountArs: 850000, occurredAt: daysAgo(6), description: "GUADALUPE EMILIANA CELI", matchStatus: "matched_income", reviewStatus: "resolved" },
];

export const monthlyBars = [
  { month: "Nov", gastos: 392000, ingresos: 720000 },
  { month: "Dic", gastos: 441000, ingresos: 760000 },
  { month: "Ene", gastos: 486000, ingresos: 790000 },
  { month: "Feb", gastos: 512000, ingresos: 810000 },
  { month: "Mar", gastos: 548000, ingresos: 835000 },
  { month: "Abr", gastos: 615000, ingresos: 850000 },
];
