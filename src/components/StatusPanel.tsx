import { useMemo } from "react";
import type { Order, OrderStatus } from "../types";
import { STATUS_META } from "../types";
import { fmtNum } from "../lib/format";

const ORDER: OrderStatus[] = ["DELIVERED", "REQUIRE_PROCESS", "REFUNDED"];

export default function StatusPanel({ orders }: { orders: Order[] }) {
  const counts = useMemo(() => {
    const c: Record<OrderStatus, number> = { DELIVERED: 0, REQUIRE_PROCESS: 0, REFUNDED: 0 };
    for (const o of orders) if (c[o.status] !== undefined) c[o.status]++;
    return c;
  }, [orders]);

  const total = orders.length || 1;

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="mb-5">
        <div className="text-sm font-bold">Status pesanan</div>
        <div className="mt-0.5 text-xs text-ink-3">{fmtNum(orders.length)} pesanan pada periode ini</div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5">
        {ORDER.map((s) => {
          const n = counts[s];
          const pct = Math.round((n / total) * 100);
          return (
            <div key={s}>
              <div className="mb-2 flex items-baseline justify-between text-[13px]">
                <span className="font-medium text-ink-2">{STATUS_META[s].label}</span>
                <span className="font-mono tabular-nums">
                  <b className="text-ink">{fmtNum(n)}</b>{" "}
                  <span className="text-xs font-medium text-ink-3">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line/40">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: pct + "%", background: STATUS_META[s].color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
