import { useMemo, useState } from "react";
import { Warning, X, CheckCircle, Users, User as UserIcon } from "@phosphor-icons/react";
import type { Order } from "../types";
import type { LogKerja, User } from "../lib/api";
import { fmtIDR, fmtNum } from "../lib/format";
import { useAuth } from "../lib/auth";

interface Props {
  orders: Order[];
  logs: LogKerja[];
  profiles?: User[];
  onClose: () => void;
  onConfirm: (targetUserId?: string) => void;
}

export default function ClosePeriodModal({ orders, logs, profiles = [], onClose, onConfirm }: Props) {
  const { user } = useAuth();
  const [targetWorker, setTargetWorker] = useState<string>(user?.id ?? "me");
  const [confirmText, setConfirmText] = useState("");

  const summary = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + o.income, 0);
    const delivered = orders.filter((o) => o.status === "DELIVERED").length;
    const processing = orders.filter((o) => o.status === "REQUIRE_PROCESS").length;
    const refunded = orders.filter((o) => o.status === "REFUNDED").length;

    const workerMap = new Map<string, { userId?: string; total: number; jobs: number }>();
    for (const l of logs) {
      const cur = workerMap.get(l.username) ?? { total: 0, jobs: 0 };
      cur.total += l.total;
      cur.jobs += 1;
      workerMap.set(l.username, cur);
    }
    const workers = Array.from(workerMap.entries())
      .map(([name, { total, jobs }]) => ({ name, total, jobs }))
      .sort((a, b) => b.total - a.total);

    return { revenue, delivered, processing, refunded, workers };
  }, [orders, logs]);

  const confirmed = confirmText.trim().toLowerCase() === "tutup";

  const handleConfirmAction = () => {
    if (!confirmed) return;
    onConfirm(targetWorker);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] border-4 border-line bg-surface p-6 shadow-[10px_10px_0px_0px_var(--color-line)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-lg font-black uppercase tracking-tight">Tutup Periode / Reset Log</div>
            <div className="text-[11px] font-black uppercase tracking-widest text-ink-3">
              Simpan ringkasan & atur ulang log kerja
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center border-2 border-line bg-bg text-ink-3 transition-all hover:bg-bad/10 hover:text-bad"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Pemilihan Target Reset */}
        <div className="mb-5 border-2 border-line bg-bg p-4">
          <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-ink">
            <UserIcon size={16} weight="bold" className="text-brand" />
            <span>Pilih Target Reset Log Kerja:</span>
          </label>
          <select
            value={targetWorker}
            onChange={(e) => setTargetWorker(e.target.value)}
            className="w-full border-2 border-line bg-surface px-3 py-2 text-xs font-bold text-ink focus:bg-bg"
          >
            <option value={user?.id ?? "me"}>Log Saya Sahaja ({user?.username ?? "Saya"})</option>
            <option value="all">Semua Pegawai & Data Toko (Global Reset)</option>
            {profiles
              .filter((p) => p.id !== user?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  Pegawai: {p.username}
                </option>
              ))}
          </select>
        </div>

        <div className="mb-5 space-y-2 border-2 border-line bg-bg p-4">
          <div className="flex items-center gap-2 text-warn">
            <Warning size={20} weight="bold" />
            <span className="text-sm font-black uppercase tracking-wide">Perhatian</span>
          </div>
          <p className="text-[12px] font-semibold text-ink-2">
            {targetWorker === "all"
              ? "Aksi ini akan menghapus SELURUH log kerja semua pegawai dan pesanan lokal."
              : `Aksi ini hanya akan mereset log kerja milik pegawai yang dipilih (${
                  targetWorker === user?.id
                    ? user?.username
                    : profiles.find((p) => p.id === targetWorker)?.username ?? "Pegawai"
                }). Log pegawai lainnya aman.`}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="border-2 border-line bg-bg p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-ink-3">Total Pendapatan Toko</div>
            <div className="font-mono text-lg font-black text-brand-strong">{fmtIDR(summary.revenue)}</div>
          </div>
          <div className="border-2 border-line bg-bg p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-ink-3">Total Pesanan Toko</div>
            <div className="font-mono text-lg font-black">{fmtNum(orders.length)}</div>
          </div>
        </div>

        {/* Pendapatan per pegawai */}
        <div className="mb-5 border-2 border-line bg-bg p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users size={18} weight="bold" className="text-brand-strong" />
            <div className="text-sm font-black uppercase tracking-wide">Pendapatan Pegawai Masing-masing</div>
          </div>

          {summary.workers.length === 0 ? (
            <div className="py-4 text-center text-[12px] font-bold text-ink-3">Belum ada log kerja pegawai</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {summary.workers.map((w) => (
                <div
                  key={w.name}
                  className="flex items-center justify-between border-2 border-line bg-surface p-2.5"
                >
                  <div>
                    <div className="text-xs font-black">{w.name}</div>
                    <div className="text-[10px] font-bold text-ink-3">{w.jobs} pekerjaan</div>
                  </div>
                  <div className="font-mono text-sm font-black text-brand-strong">{fmtIDR(w.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-ink-2">
            Konfirmasi — ketik <span className="text-bad">tutup</span>
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="tutup"
            className="h-10 w-full border-2 border-line bg-bg px-3 text-sm font-semibold uppercase"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 border-2 border-line bg-bg px-4 text-[12px] font-extrabold uppercase tracking-wide text-ink-2 transition-all hover:bg-surface-2 hover:text-ink"
          >
            Batal
          </button>
          <button
            onClick={handleConfirmAction}
            disabled={!confirmed}
            className="inline-flex h-10 items-center gap-2 border-2 border-line bg-bad px-4 text-[12px] font-extrabold uppercase tracking-wide text-bg shadow-[3px_3px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40"
          >
            <CheckCircle size={16} weight="bold" />
            Tutup Periode
          </button>
        </div>
      </div>
    </div>
  );
}
