import { Users } from "@phosphor-icons/react";
import { api, parseWorkerPayouts, type LogKerja } from "../lib/api";
import { fmtIDR } from "../lib/format";
import { useEffect, useMemo, useState } from "react";

interface Props {
  days: number | "all";
}

export default function WorkerSummary({ days }: Props) {
  const [logs, setLogs] = useState<LogKerja[]>([]);

  useEffect(() => {
    api.getLogs().then(setLogs).catch(console.error);
  }, []);

  const byWorker = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    if (days !== "all") cutoff.setDate(cutoff.getDate() - (Number(days) - 1));

    const filteredLogs = days === "all" ? logs : logs.filter((l) => new Date(l.created_at) >= cutoff);
    const map = parseWorkerPayouts(filteredLogs);

    return Array.from(map.entries())
      .map(([name, { total, jobs }]) => ({ name, total, jobs }))
      .sort((a, b) => b.total - a.total);
  }, [logs, days]);

  const grandTotal = byWorker.reduce((s, w) => s + w.total, 0);

  return (
    <div className="border-4 border-line bg-surface p-5 shadow-[6px_6px_0px_0px_var(--color-line)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-ink-3">Pembagian Hasil</div>
          <div className="text-lg font-black uppercase tracking-tight">Per Pegawai</div>
        </div>
        <div className="grid h-10 w-10 place-items-center border-2 border-line bg-brand text-bg">
          <Users size={18} weight="bold" />
        </div>
      </div>

      {byWorker.length === 0 ? (
        <div className="py-6 text-center text-sm font-bold text-ink-3">Belum ada log kerja</div>
      ) : (
        <div className="space-y-2">
          {byWorker.map((w) => (
            <div
              key={w.name}
              className="flex items-center justify-between border-2 border-line bg-bg p-3"
            >
              <div>
                <div className="text-sm font-black">{w.name}</div>
                <div className="text-[11px] font-bold text-ink-3">{w.jobs} pekerjaan</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-base font-black text-brand-strong">{fmtIDR(w.total)}</div>
                {grandTotal > 0 && (
                  <div className="text-[10px] font-bold text-ink-3">
                    {Math.round((w.total / grandTotal) * 100)}% dari total
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="mt-3 flex items-center justify-between border-t-2 border-line pt-3">
            <span className="text-[12px] font-black uppercase tracking-wide">Total Dibagikan</span>
            <span className="font-mono text-lg font-black">{fmtIDR(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
