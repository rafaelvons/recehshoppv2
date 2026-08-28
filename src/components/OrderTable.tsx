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
    <div className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="mb-4">
        <div className="text-sm font-bold">Riwayat pesanan</div>
        <div className="mt-0.5 text-xs text-ink-3">
          {fmtNum(orders.length)} pesanan (tampil 50 terbaru)
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="py-12 text-center text-sm text-ink-3">
          <div className="font-semibold text-ink-2">Belum ada pesanan</div>
          Klik tombol "Pesanan" untuk menambah manual, atau Import dari CSV.
        </div>
      ) : (
        <div className="max-h-[440px] overflow-y-auto overscroll-contain rounded-xl">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-left">
                {["No. Order", "Produk", "Game", "Harga", "Qty", "Pendapatan", "Status", "Tanggal", ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className={`whitespace-nowrap border-b border-line bg-surface px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3 ${
                        i >= 3 && i <= 5 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((o) => {
                const meta = STATUS_META[o.status];
                return (
                  <tr key={o.id} className="border-b border-line transition-colors last:border-b-0 hover:bg-surface-2/50">
                    <td className="whitespace-nowrap px-2.5 py-2.5 font-mono text-xs text-ink-2">
                      {o.no || "-"}
                    </td>
                    <td className="px-2.5 py-2.5 font-semibold">{o.product}</td>
                    <td className="hidden whitespace-nowrap px-2.5 py-2.5 text-xs text-ink-2 md:table-cell">
                      {o.game || "-"}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono tabular-nums">
                      {fmtNum(o.price)}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono tabular-nums">
                      {o.qty}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono font-semibold tabular-nums">
                      {o.income ? fmtIDR(o.income) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.soft}`}
                      >
                        <i className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-2.5 py-2.5 font-mono text-xs text-ink-2 sm:table-cell">
                      {fmtDate(o.date)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right">
                      <button
                        onClick={() => {
                          if (confirm("Hapus pesanan ini?")) onDelete(o.id);
                        }}
                        title="Hapus"
                        aria-label="Hapus pesanan"
                        className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-bad/10 hover:text-bad active:scale-[.95]"
                      >
                        <Trash size={14} />
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
