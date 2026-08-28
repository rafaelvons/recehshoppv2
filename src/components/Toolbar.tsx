import {
  ArrowClockwise,
  CalendarX,
  DownloadSimple,
  UploadSimple,
} from "@phosphor-icons/react";
import type { OrderStatus, RangeKey } from "../types";
import { STATUS_META } from "../types";

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "7", label: "7 hari" },
  { key: "30", label: "30 hari" },
  { key: "90", label: "90 hari" },
  { key: "all", label: "Semua" },
];

const STATUS_FILTERS: Array<{ key: OrderStatus | "all"; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "REQUIRE_PROCESS", label: "Diproses" },
  { key: "DELIVERED", label: "Selesai" },
  { key: "REFUNDED", label: "Refund" },
];

interface Props {
  range: RangeKey;
  onRange: (r: RangeKey) => void;
  status: OrderStatus | "all";
  onStatus: (s: OrderStatus | "all") => void;
  onSync: () => void;
  onImport: () => void;
  onExport: () => void;
  onClosePeriod: () => void;
}

export default function Toolbar({
  range,
  onRange,
  status,
  onStatus,
  onSync,
  onImport,
  onExport,
  onClosePeriod,
}: Props) {
  return (
    <div className="flex flex-col gap-4 border-4 border-line bg-surface p-4 shadow-[6px_6px_0px_0px_var(--color-line)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Periode */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-ink-3">Periode</span>
          <div className="inline-flex border-2 border-line bg-bg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => onRange(r.key)}
                className={`px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-wide transition-all ${
                  range === r.key
                    ? "bg-ink text-bg"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aksi */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSync}
            className="inline-flex h-10 items-center gap-2 border-2 border-line bg-bg px-4 text-[12px] font-extrabold uppercase tracking-wide text-brand-strong shadow-[3px_3px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-surface-2 hover:shadow-none active:translate-y-0.5"
          >
            <ArrowClockwise size={16} weight="bold" />
            Tarik
          </button>
          <button
            onClick={onImport}
            className="inline-flex h-10 items-center gap-2 border-2 border-line bg-bg px-4 text-[12px] font-extrabold uppercase tracking-wide text-ink shadow-[3px_3px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-surface-2 hover:shadow-none active:translate-y-0.5"
          >
            <UploadSimple size={16} weight="bold" />
            Import
          </button>
          <button
            onClick={onExport}
            className="inline-flex h-10 items-center gap-2 border-2 border-line bg-bg px-4 text-[12px] font-extrabold uppercase tracking-wide text-ink shadow-[3px_3px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-surface-2 hover:shadow-none active:translate-y-0.5"
          >
            <DownloadSimple size={16} weight="bold" />
            Export
          </button>
          <button
            onClick={onClosePeriod}
            className="inline-flex h-10 items-center gap-2 border-2 border-line bg-bg px-4 text-[12px] font-extrabold uppercase tracking-wide text-bad shadow-[3px_3px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-bad/10 hover:shadow-none active:translate-y-0.5"
          >
            <CalendarX size={16} weight="bold" />
            Tutup Periode
          </button>
        </div>
      </div>

      {/* Filter status */}
      <div className="flex flex-wrap items-center gap-2 border-t-2 border-line pt-3">
        <span className="text-[11px] font-black uppercase tracking-widest text-ink-3">Status</span>
        {STATUS_FILTERS.map((s) => {
          const active = status === s.key;
          const meta = s.key === "all" ? null : STATUS_META[s.key];
          return (
            <button
              key={s.key}
              onClick={() => onStatus(s.key)}
              className={`inline-flex items-center gap-1.5 border-2 px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-wide transition-all ${
                active
                  ? "border-line bg-ink text-bg shadow-[2px_2px_0px_0px_var(--color-line)]"
                  : "border-line/40 bg-bg text-ink-2 hover:border-line hover:text-ink"
              }`}
            >
              {meta && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: meta.color }}
                />
              )}
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
