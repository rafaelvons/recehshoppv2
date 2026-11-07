import type { Barang } from "./api";

/** Kolom persis seperti file "itemku_ubah_sekaligus_semua_game_*.xlsx" */
export const ITEMKU_HEADERS = [
  "Nama Game",
  "Nama Tipe",
  "ID Item",
  "Server Name",
  "Grup Name",
  "Nama Item",
  "Stok",
  "Metode Pengiriman",
  "Min. Pesanan",
  "Harga",
] as const;

export const ITEMKU_SHEET_NAME = "Template itemku";

/** Potongan pajak itemku 12% */
export const TAX_RATE = 0.88;

export interface ExcelRow {
  rowNumber: number; // nomor baris di Excel (untuk pesan error)
  nama_game: string;
  nama_tipe: string;
  id_item: number | null;
  server_name: string | null;
  grup_name: string | null;
  nama_item: string;
  stok: number;
  metode_pengiriman: number;
  min_pesanan: number;
  harga: number; // harga itemku (harga_asli)
}

export type PreviewStatus = "ubah" | "baru" | "sama";

export interface PreviewRow {
  row: ExcelRow;
  status: PreviewStatus;
  existing: Barang | null;
  harga_asli_baru: number;
  harga_jual_baru: number;
}

function norm(s: unknown): string {
  return String(s ?? "").trim();
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const cleaned = String(v ?? "").replace(/[^0-9-]/g, "");
  return cleaned ? Number(cleaned) : NaN;
}

function key(game: string, item: string): string {
  return `${game.toLowerCase().trim()}||${item.toLowerCase().trim()}`;
}

/** Baca file Excel format itemku. Melempar Error kalau formatnya beda. */
export async function parseItemkuExcel(file: File): Promise<{ rows: ExcelRow[]; skipped: string[] }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetName = wb.SheetNames.includes(ITEMKU_SHEET_NAME) ? ITEMKU_SHEET_NAME : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error("File Excel kosong");

  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  if (raw.length === 0) throw new Error("File Excel kosong");

  // Cari posisi kolom berdasarkan judul header
  const header = (raw[0] as unknown[]).map((h) => norm(h).toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const missing = ["Nama Game", "Nama Item", "Harga"].filter((h) => col(h) === -1);
  if (missing.length) {
    throw new Error(
      `Format Excel tidak sesuai. Kolom tidak ditemukan: ${missing.join(", ")}. ` +
        `Pakai format "${ITEMKU_HEADERS.join(" | ")}".`
    );
  }

  const idx = Object.fromEntries(ITEMKU_HEADERS.map((h) => [h, col(h)])) as Record<
    (typeof ITEMKU_HEADERS)[number],
    number
  >;
  const get = (r: unknown[], h: (typeof ITEMKU_HEADERS)[number]) => (idx[h] >= 0 ? r[idx[h]] : "");

  const rows: ExcelRow[] = [];
  const skipped: string[] = [];

  raw.slice(1).forEach((r, i) => {
    const rowNumber = i + 2;
    const nama_game = norm(get(r, "Nama Game"));
    const nama_item = norm(get(r, "Nama Item"));
    if (!nama_game && !nama_item) return; // baris kosong

    const harga = toNumber(get(r, "Harga"));
    if (!nama_item || !nama_game) {
      skipped.push(`Baris ${rowNumber}: Nama Game / Nama Item kosong`);
      return;
    }
    if (!Number.isFinite(harga) || harga <= 0) {
      skipped.push(`Baris ${rowNumber} (${nama_item}): harga tidak valid`);
      return;
    }

    const idItem = toNumber(get(r, "ID Item"));
    const stok = toNumber(get(r, "Stok"));
    const metode = toNumber(get(r, "Metode Pengiriman"));
    const minPesanan = toNumber(get(r, "Min. Pesanan"));

    rows.push({
      rowNumber,
      nama_game,
      nama_tipe: norm(get(r, "Nama Tipe")),
      id_item: Number.isFinite(idItem) ? idItem : null,
      server_name: norm(get(r, "Server Name")) || null,
      grup_name: norm(get(r, "Grup Name")) || null,
      nama_item,
      stok: Number.isFinite(stok) ? stok : 0,
      metode_pengiriman: Number.isFinite(metode) ? metode : 0,
      min_pesanan: Number.isFinite(minPesanan) && minPesanan > 0 ? minPesanan : 1,
      harga: Math.round(harga),
    });
  });

  return { rows, skipped };
}

/** Cocokkan baris Excel dengan barang di database: pakai ID Item, kalau tidak ada pakai Nama Game + Nama Item. */
export function buildPreview(rows: ExcelRow[], items: Barang[]): PreviewRow[] {
  const byIdItem = new Map<number, Barang>();
  const byName = new Map<string, Barang>();
  for (const b of items) {
    if (b.id_item != null) byIdItem.set(Number(b.id_item), b);
    byName.set(key(b.nama_game, b.nama_item), b);
  }

  return rows.map((row) => {
    const existing =
      (row.id_item != null ? byIdItem.get(row.id_item) : undefined) ??
      byName.get(key(row.nama_game, row.nama_item)) ??
      null;
    const harga_asli_baru = row.harga;
    const harga_jual_baru = Math.round(row.harga * TAX_RATE);
    let status: PreviewStatus = "baru";
    if (existing) {
      status = existing.harga_asli === harga_asli_baru && existing.harga_jual === harga_jual_baru ? "sama" : "ubah";
    }
    return { row, status, existing, harga_asli_baru, harga_jual_baru };
  });
}

/** Download semua barang dalam format Excel itemku (bisa diedit lalu di-upload lagi). */
export async function downloadItemkuExcel(items: Barang[]): Promise<void> {
  const XLSX = await import("xlsx");
  const data: (string | number)[][] = [
    [...ITEMKU_HEADERS],
    ...items.map((b) => [
      b.nama_game,
      b.nama_tipe ?? "",
      b.id_item ?? "",
      b.server_name ?? "",
      b.grup_name ?? "",
      b.nama_item,
      b.stok ?? 0,
      b.metode_pengiriman ?? 0,
      b.min_pesanan ?? 1,
      b.harga_asli,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [20, 12, 10, 14, 14, 50, 8, 18, 12, 12].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, ITEMKU_SHEET_NAME);

  const d = new Date();
  const tgl = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  XLSX.writeFile(wb, `itemku_ubah_sekaligus_semua_game_${tgl}.xlsx`);
}
