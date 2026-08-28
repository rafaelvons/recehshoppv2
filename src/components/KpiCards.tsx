import { Crown, Receipt, ShoppingBagOpen, TrendDown, TrendUp, Wallet } from "@phosphor-icons/react";
import type { Order } from "../types";
import { fmtNum, fmtShortIDR } from "../lib/format";

export interface KpiData {
  revenue: number;
  count: number;
  delivered: number;
  avg: number;
  topProduct: { name: string; revenue: number } | null;
  deltaPct: number | null;
}

export function computeKpis(orders: Order[], rangeDays: number | "all"): KpiData {
  const range = rangeDays === "all" ? 30 : rangeDays;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const curStart = new Date(today);
  curStart.setDate(curStart.getDate() - (range - 1));
  const prevStart = new Date(curStart);
  prevStart.setDate(prevStart.getDate() - range);

  const inWindow = (o: Order, from: Date, to: Date) => {
    const d = new Date(o.date);
    return d >= from && d < to;
  };

  const cur = orders.filter((o) => inWindow(o, curStart, new Date(today.getTime() + 86400000)));
  const prev = orders.filter((o) => inWindow(o, prevStart, curStart));

  const revenue = cur.reduce((s, o) => s + o.income, 0);
  const prevRevenue = prev.reduce((s, o) => s + o.income, 0);
  const deltaPct =
    prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : revenue > 0 ? null : 0;

  const byProduct = new Map<string, number>();
  for (const o of cur) {
    const k = o.product || "Lainnya";
    byProduct.set(k, (byProduct.get(k) ?? 0) + o.income);
  }
  let topProduct: KpiData["topProduct"] = null;
  for (const [name, rev] of byProduct) {
    if (!topProduct || rev > topProduct.revenue) topProduct = { name, revenue: rev };
  }

  return {
    revenue,
    count: cur.length,
    delivered: cur.filter((o) => o.status === "DELIVERED").length,
    avg: cur.length ? revenue / cur.length : 0,
    topProduct,
    deltaPct,
  };
}

function DeltaChip({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs font-extrabold uppercase text-ink-3">belum ada data</span>;
  const abs = Math.abs(pct);
  if (abs < 0.5)
    return <span className="text-xs font-extrabold uppercase text-ink-3">stabil</span>;
  const up = pct >= 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase">
      <span
        className={`inline-flex items-center gap-0.5 border-2 px-1.5 py-0.5 font-mono text-[11px] font-black tabular-nums ${
          up ? "border-ok text-ok" : "border-bad text-bad"
        }`}
      >
        {up ? <TrendUp size={11} weight="bold" /> : <TrendDown size={11} weight="bold" />}
        {up ? "+" : "-"}
        {fmtNum(Math.round(abs))}%
      </span>
      <span className="text-ink-3">vs lalu</span>
    </span>
  );
}

function Card({
  icon,
  label,
  value,
  sub,
  mono,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: React.ReactNode;
  mono?: boolean;
  accent: "brand" | "blue" | "cyan" | "violet";
}) {
  const accentClass =
    accent === "brand"
      ? "bg-brand text-bg"
      : accent === "blue"
      ? "bg-[#3b82f6] text-white"
      : accent === "cyan"
      ? "bg-[#22d3ee] text-bg"
      : "bg-[#6366f1] text-white";

  return (
    <div className="relative border-4 border-line bg-surface p-5 shadow-[6px_6px_0px_0px_var(--color-line)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-black uppercase tracking-widest text-ink-3">{label}</div>
        <div className={`grid h-9 w-9 place-items-center ${accentClass}`}>
          {icon}
        </div>
      </div>
      <div
        className={`mt-4 text-[28px] font-black leading-none tracking-tight ${
          mono ? "font-mono tabular-nums" : "truncate"
        }`}
      >
        {value}
      </div>
      <div className="mt-3">{sub}</div>
    </div>
  );
}

export default function KpiCards({ data }: { data: KpiData }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card
        icon={<Wallet size={18} weight="bold" />}
        label="Pendapatan"
        value={fmtShortIDR(data.revenue)}
        mono
        accent="brand"
        sub={<DeltaChip pct={data.deltaPct} />}
      />

      <Card
        icon={<ShoppingBagOpen size={18} weight="bold" />}
        label="Pesanan"
        value={fmtNum(data.count)}
        mono
        accent="blue"
        sub={
          <span className="text-xs font-black uppercase text-ink-3">
            <b className="font-mono text-ink-2">{fmtNum(data.delivered)}</b> selesai
          </span>
        }
      />

      <Card
        icon={<Receipt size={18} weight="bold" />}
        label="Rata-rata"
        value={fmtShortIDR(data.avg)}
        mono
        accent="cyan"
        sub={
          <span className="text-xs font-black uppercase text-ink-3">
            dari <b className="font-mono text-ink-2">{fmtNum(data.count)}</b> pesanan
          </span>
        }
      />

      <Card
        icon={<Crown size={18} weight="bold" />}
        label="Terlaris"
        value={data.topProduct ? data.topProduct.name : "-"}
        accent="violet"
        sub={
          data.topProduct ? (
            <span className="font-mono text-xs font-black tabular-nums text-brand-strong">
              {fmtShortIDR(data.topProduct.revenue)}
            </span>
          ) : (
            <span className="text-xs font-black uppercase text-ink-3">belum ada data</span>
          )
        }
      />
    </div>
  );
}
