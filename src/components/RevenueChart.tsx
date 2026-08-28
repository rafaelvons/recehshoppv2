import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Order } from "../types";
import { fmtDay, fmtIDR, fmtNum, fmtShortIDR } from "../lib/format";

interface DayPoint {
  date: string;
  rev: number;
  count: number;
}

function buildSeries(orders: Order[], days: number): DayPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), { date: d.toISOString().slice(0, 10), rev: 0, count: 0 });
  }
  for (const o of orders) {
    const key = new Date(o.date).toISOString().slice(0, 10);
    const p = map.get(key);
    if (p) {
      p.rev += o.income;
      p.count++;
    }
  }
  return [...map.values()];
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p: DayPoint = payload[0].payload;
  return (
    <div className="rounded-xl border border-line-strong bg-surface-2 px-3.5 py-2.5 text-xs shadow-2xl">
      <div className="mb-1.5 font-semibold text-ink">{label}</div>
      <div className="font-mono font-bold tabular-nums text-brand-strong">{fmtIDR(p.rev)}</div>
      <div className="mt-0.5 text-ink-3">{fmtNum(p.count)} pesanan</div>
    </div>
  );
}

export default function RevenueChart({ orders, days }: { orders: Order[]; days: number }) {
  const data = useMemo(() => buildSeries(orders, days), [orders, days]);
  const total = useMemo(() => data.reduce((s, d) => s + d.rev, 0), [data]);

  const tick = { fill: "var(--color-ink-3)", fontSize: 11, fontFamily: "var(--font-mono)" };

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold">Pendapatan per hari</div>
          <div className="mt-0.5 text-xs text-ink-3">
            {data[0]?.date} sampai {data[data.length - 1]?.date}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
            <i className="h-2 w-2 rounded-[3px] bg-brand" />
            Pendapatan
          </span>
          <span className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-[13px] font-bold tabular-nums">
            {fmtShortIDR(total)}
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
              tickFormatter={fmtDay}
              interval={Math.max(0, Math.ceil(data.length / 8) - 1)}
              minTickGap={28}
            />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => fmtShortIDR(v)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-line-strong)" }} />
            <Area
              type="monotone"
              dataKey="rev"
              stroke="var(--color-brand)"
              strokeWidth={2.2}
              fill="url(#revFill)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-surface)", stroke: "var(--color-brand)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
