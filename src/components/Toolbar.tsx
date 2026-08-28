import {
  ArrowClockwise,
  DownloadSimple,
  MagnifyingGlass,
  Plus,
  UploadSimple,
} from "@phosphor-icons/react";
import type { OrderStatus, RangeKey } from "../types";

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
  search: string;
  onSearch: (s: string) => void;
  status: OrderStatus | "all";
  onStatus: (s: OrderStatus | "all") => void;
  onSync: () => void;
  onImport: () => void;
  onExport: () => void;
}

export default function Toolbar({
  range,
  onRange,
  search,
  onSearch,
  status,
  onStatus,
  onSync,
  onImport,
  onExport,
}: Props) {
  return (
    <div className="flex flex-col gap-3 pb-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-0.5 rounded-lg border border-line bg-surface-2 p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => onRange(r.key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                range === r.key
                  ? "bg-ink text-bg shadow-sm"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-[280px] min-w-[160px] flex-1">
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari produk, game, order..."
            className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm placeholder:text-ink-3 transition-colors hover:border-line-strong"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              onClick={() => onStatus(s.key)}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors active:scale-[.98] ${
                status === s.key
                  ? "border-transparent bg-ink text-bg"
                  : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onSync}
          className="inline-flex h-9 items-center gap-1.5 border-2 border-line bg-surface px-3 text-[12px] font-extrabold uppercase tracking-wide text-brand-strong transition-all hover:bg-ink hover:text-bg active:translate-y-0.5"
        >
          <ArrowClockwise size={15} weight="bold" />
          Tarik
        </button>
        <button
          onClick={onImport}
          className="inline-flex h-9 items-center gap-1.5 border-2 border-line bg-surface px-3 text-[12px] font-extrabold uppercase tracking-wide text-ink transition-all hover:bg-ink hover:text-bg active:translate-y-0.5"
        >
          <UploadSimple size={15} weight="bold" />
          Import
        </button>
        <button
          onClick={onExport}
          className="inline-flex h-9 items-center gap-1.5 border-2 border-line bg-surface px-3 text-[12px] font-extrabold uppercase tracking-wide text-ink transition-all hover:bg-ink hover:text-bg active:translate-y-0.5"
        >
          <DownloadSimple size={15} weight="bold" />
          Export
        </button>
      </div>
    </div>
  );
}
