import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Target } from "@phosphor-icons/react";
import { logShares, type LogKerja } from "../lib/api";
import { localDateKey } from "../lib/logExport";
import { fmtIDR, fmtShortIDR } from "../lib/format";

/** Target pendapatan per orang per hari */
export const DAILY_TARGET = 100_000;

interface DayPoint {
  date: string;
  label: string;
  amount: number;
  jobs: number;
}

function buildSeries(logs: LogKerja[], worker: string, days: number): DayPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    map.set(key, {
      date: key,
      label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      amount: 0,
      jobs: 0,
    });
  }
  const me = worker.toLowerCase();
  for (const l of logs) {
    const p = map.get(localDateKey(new Date(l.created_at)));
    if (!p) continue;
    const { workers, share } = logShares(l);
    if (workers.some((w) => w.toLowerCase() === me)) {
      p.amount += share;
      p.jobs += 1;
    }
  }
  return [...map.values()];
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: DayPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const hit = p.amount >= DAILY_TARGET;
  return (
    <div className="border-2 border-line bg-surface-2 px-3 py-2 text-xs shadow-2xl">
      <div className="mb-1 font-black">{p.label}</div>
      <div className="font-mono font-black text-brand-strong">{fmtIDR(p.amount)}</div>
      <div className="text-ink-3">{p.jobs} pekerjaan</div>
      <div className={`mt-1 font-extrabold ${hit ? "text-ok" : "text-bad"}`}>
        {hit ? "Target tercapai" : `Kurang ${fmtIDR(DAILY_TARGET - p.amount)}`}
      </div>
    </div>
  );
}

interface Props {
  logs: LogKerja[];
  workers: string[];
  me: string;
}

export default function DailyTarget({ logs, workers, me }: Props) {
  const [worker, setWorker] = useState(me);
  const [days, setDays] = useState(14);

  const options = useMemo(() => {
    const set = new Set(workers);
    if (me) set.add(me);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [workers, me]);

  const data = useMemo(() => buildSeries(logs, worker, days), [logs, worker, days]);
  const today = data[data.length - 1]?.amount ?? 0;
  const progress = Math.min(100, Math.round((today / DAILY_TARGET) * 100));
  const hitDays = data.filter((d) => d.amount >= DAILY_TARGET).length;
  const total = data.reduce((s, d) => s + d.amount, 0);
  const avg = Math.round(total / Math.max(1, data.length));
  const yMax = Math.max(DAILY_TARGET * 1.2, ...data.map((d) => d.amount));

  const tick = { fill: "var(--color-ink-3)", fontSize: 11, fontFamily: "var(--font-mono)" };
  const isMe = worker.toLowerCase() === me.toLowerCase();

  return (
    <div className="space-y-4 border-2 border-line bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-base font-black uppercase tracking-tight">
            <Target size={18} weight="bold" /> Target Harian {isMe ? "Saya" : worker}
          </h3>
          <p className="text-[12px] font-bold text-ink-3">
            Target {fmtIDR(DAILY_TARGET)} / orang / hari. Kerjaan split dihitung sesuai porsi masing-masing.
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          <select
            value={worker}
            onChange={(e) => setWorker(e.target.value)}
            className="h-9 border-2 border-line bg-bg px-2 text-[12px] font-bold"
            aria-label="Pilih pegawai"
          >
            {options.map((w) => (
              <option key={w} value={w}>
                {w}
                {w.toLowerCase() === me.toLowerCase() ? " (Saya)" : ""}
              </option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 border-2 border-line bg-bg px-2 text-[12px] font-bold"
            aria-label="Rentang hari"
          >
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
            <option value={30}>30 hari</option>
          </select>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="border-2 border-line bg-bg p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-3">Hari ini</div>
          <div className={`text-lg font-black ${today >= DAILY_TARGET ? "text-ok" : "text-brand-strong"}`}>
            {fmtIDR(today)}
          </div>
          <div className="mt-1.5 h-2 w-full border border-line bg-surface-2">
            <div
              className={`h-full ${today >= DAILY_TARGET ? "bg-ok" : "bg-brand"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] font-bold text-ink-3">
            {today >= DAILY_TARGET ? "Target tercapai 🎉" : `${progress}% · kurang ${fmtIDR(DAILY_TARGET - today)}`}
          </div>
        </div>
        <div className="border-2 border-line bg-bg p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-3">Hari capai target</div>
          <div className="text-lg font-black">
            {hitDays} / {data.length} hari
          </div>
          <div className="text-[11px] font-bold text-ink-3">dalam {days} hari terakhir</div>
        </div>
        <div className="border-2 border-line bg-bg p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-3">Rata-rata / hari</div>
          <div className={`text-lg font-black ${avg >= DAILY_TARGET ? "text-ok" : ""}`}>{fmtIDR(avg)}</div>
          <div className="text-[11px] font-bold text-ink-3">Total {fmtIDR(total)}</div>
        </div>
      </div>

      {/* Grafik */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-line)" strokeOpacity={0.15} vertical={false} />
            <XAxis
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
              interval={Math.max(0, Math.ceil(data.length / 10) - 1)}
            />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={[0, yMax]}
              tickFormatter={(v: number) => fmtShortIDR(v)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-line)", fillOpacity: 0.06 }} />
            <ReferenceLine
              y={DAILY_TARGET}
              stroke="var(--color-ok)"
              strokeDasharray="6 4"
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
            <Bar dataKey="amount" maxBarSize={36}>
              {data.map((d) => (
                <Cell key={d.date} fill={d.amount >= DAILY_TARGET ? "var(--color-ok)" : "var(--color-brand)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] font-bold text-ink-3">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 bg-ok" /> Capai target
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 bg-brand" /> Belum capai target
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-4 border-t-2 border-dashed border-ok" /> Garis target {fmtShortIDR(DAILY_TARGET)}
        </span>
      </div>
    </div>
  );
}
