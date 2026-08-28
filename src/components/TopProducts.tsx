import { useMemo } from "react";
import type { Order } from "../types";
import { fmtNum, fmtShortIDR } from "../lib/format";

interface TopRow {
  product: string;
  game: string;
  revenue: number;
  qty: number;
}

export default function TopProducts({ orders }: { orders: Order[] }) {
  const rows = useMemo<TopRow[]>(() => {
    const map = new Map<string, TopRow>();
    for (const o of orders) {
      const key = (o.product || "Lainnya") + "||" + (o.game || "");
      const cur = map.get(key) ?? { product: o.product || "Lainnya", game: o.game || "", revenue: 0, qty: 0 };
      cur.revenue += o.income;
      cur.qty += o.qty || 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [orders]);

  const max = rows.length ? rows[0].revenue : 1;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="mb-3">
        <div className="text-sm font-bold">Produk terlaris</div>
        <div className="mt-0.5 text-xs text-ink-3">Berdasarkan pendapatan periode ini</div>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-3">
          <div className="font-semibold text-ink-2">Tidak ada data</div>
          Tambah pesanan atau import data dulu
        </div>
      ) : (
        <div className="flex flex-col">
          {rows.map((r, i) => (
            <div
              key={r.product + r.game}
              className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
            >
              <div
                className={`grid h-6 w-6 flex-none place-items-center rounded-lg font-mono text-[11px] font-bold ${
                  i === 0 ? "bg-brand/15 text-brand-strong" : "bg-surface-2 text-ink-3"
                }`}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{r.product}</div>
                <div className="text-[11.5px] text-ink-3">
                  {r.game} - {fmtNum(r.qty)} terjual
                </div>
              </div>
              <div className="w-[86px] shrink-0 text-right">
                <div className="font-mono text-[13px] font-bold tabular-nums">
                  {fmtShortIDR(r.revenue)}
                </div>
                <div className="ml-auto mt-1.5 h-1 overflow-hidden rounded-full bg-line/40">
                  <div
                    className="h-full rounded-full bg-brand/80"
                    style={{ width: Math.max((r.revenue / max) * 100, 6) + "%" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
