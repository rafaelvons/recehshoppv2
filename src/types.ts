export type OrderStatus = "REQUIRE_PROCESS" | "DELIVERED" | "REFUNDED";

export interface Order {
  id: string;
  no: string;
  product: string;
  game: string;
  price: number;
  qty: number;
  income: number;
  status: OrderStatus;
  date: string; // ISO
}

export type RangeKey = "7" | "30" | "90" | "all";

export const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; soft: string }
> = {
  DELIVERED: {
    label: "Selesai",
    color: "var(--color-ok)",
    soft: "bg-ok/10 text-ok",
  },
  REQUIRE_PROCESS: {
    label: "Diproses",
    color: "var(--color-warn)",
    soft: "bg-warn/10 text-warn",
  },
  REFUNDED: {
    label: "Refund",
    color: "var(--color-bad)",
    soft: "bg-bad/10 text-bad",
  },
};
