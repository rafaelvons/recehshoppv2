import { Trash } from "@phosphor-icons/react";
import type { Order } from "../types";
import { STATUS_META } from "../types";
import { fmtDate, fmtIDR, fmtNum } from "../lib/format";

interface Props {
  orders: Order[];
  onDelete: (id: string) => void;
}

export default function OrderTable({ orders, onDelete }: Props) {
  const sorted = [...orders].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 50);

  return (
    <div className="border-4 border-line bg-surface p-5 shadow-[6px_6px_0px_0px_var(--color-line)]">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-black uppercase tracking-tight">Riwayat Pesanan</div>
          <div className="text-[11px] font-black uppercase tracking-widest text-ink-3">
            {fmtNum(orders.length)} pesanan (tampil 50 terbaru)
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="border-2 border-dashed border-line-strong bg-bg py-12 text-center">
          <div className="text-sm font-black text-ink-2">Belum ada pesanan</div>
          <div className="mt-1 text-xs font-bold text-ink-3">
            Gunakan tombol Import atau Tarik untuk mengisi data
          </div>
        </div>
      ) : (
        <div className="max-h-[440px] overflow-y-auto overscroll-contain border-2 border-line bg-bg">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b-2 border-line bg-surface-2 text-left">
                {["No. Order", "Produk", "Game", "Harga", "Qty", "Pendapatan", "Status", "Tanggal", ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-ink-3 ${
                        i >= 3 && i <= 5 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/30">
              {sorted.map((o) => {
                const meta = STATUS_META[o.status];
                return (
                  <tr key={o.id} className="transition-colors hover:bg-surface-2/40">
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-ink-2">
                      {o.no || "-"}
                    </td>
                    <td className="px-3 py-2.5 font-bold">{o.product}</td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-xs text-ink-2 md:table-cell">
                      {o.game || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums">
                      {fmtNum(o.price)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums">
                      {o.qty}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold tabular-nums">
                      {fmtIDR(o.income)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 border-2 px-2 py-1 text-[11px] font-black uppercase tracking-wide ${meta.soft.replace("bg-", "border-").replace("/10", "")} ${meta.soft}`}
                      >
                        <i className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 font-mono text-xs text-ink-2 sm:table-cell">
                      {fmtDate(o.date)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => {
                          if (confirm("Hapus pesanan ini?")) onDelete(o.id);
                        }}
                        title="Hapus"
                        aria-label="Hapus pesanan"
                        className="grid h-8 w-8 place-items-center border-2 border-line bg-bg text-ink-3 transition-all hover:border-bad hover:bg-bad/10 hover:text-bad active:translate-y-0.5"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
