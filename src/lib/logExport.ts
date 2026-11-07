import { buyerFromDeskripsi, logShares, type LogKerja } from "./api";

function cell(v: string | number): string {
  return '"' + String(v).replace(/"/g, '""') + '"';
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Tanggal lokal (WIB di HP/PC pegawai), bukan UTC */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function logsToCSV(logs: LogKerja[]): string {
  const header = [
    "Tanggal",
    "Jam",
    "Nama Pembeli",
    "Game",
    "Nama Item",
    "Qty",
    "Harga Satuan",
    "Total",
    "Pekerja",
    "Jumlah Pekerja",
    "Porsi per Orang",
    "Pembuat Log",
  ];
  const rows = logs.map((l) => {
    const d = new Date(l.created_at);
    const { workers, share } = logShares(l);
    return [
      localDateKey(d),
      `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      buyerFromDeskripsi(l.deskripsi),
      l.nama_game,
      l.nama_item,
      l.qty,
      l.harga_satuan,
      l.total,
      workers.join(", "),
      workers.length,
      share,
      l.username,
    ];
  });
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadLogsCSV(logs: LogKerja[], label = "semua"): void {
  // BOM supaya Excel membaca huruf dengan benar
  const blob = new Blob(["﻿" + logsToCSV(logs)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const safe = label.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  a.download = `recehshopp-log-kerja-${safe}-${localDateKey(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
