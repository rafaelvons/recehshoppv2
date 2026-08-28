import type { Order, OrderStatus } from "../types";

const VALID_STATUS: OrderStatus[] = ["REQUIRE_PROCESS", "DELIVERED", "REFUNDED"];

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/^"|"$/g, "").replace(/\r/g, "");

function csvRow(line: string): string[] {
  // dukung pemisah koma atau titik-koma, abaikan baris yang diapit tanda kutip ganda
  return line.split(/[;,]/).map((x) => x.trim().replace(/^"|"$/g, ""));
}

export function parseCSV(raw: string): Order[] {
  const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  const header = csvRow(lines[0]).map(normalize);
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iProd = idx(["product_name", "product", "nama", "nama_produk"]);
  const iGame = idx(["game_name", "game", "kategori", "game/category"]);
  const iPrice = idx(["price", "harga", "harga_jual"]);
  const iQty = idx(["quantity", "qty", "jumlah"]);
  const iIncome = idx(["order_income", "income", "pendapatan"]);
  const iStatus = idx(["status", "order_status"]);
  const iDate = idx(["order_created_at", "date", "tanggal", "created_at"]);
  const iNo = idx(["order_number", "order_id", "no", "nomor", "id"]);

  const out: Order[] = [];
  for (const line of lines.slice(1)) {
    const c = csvRow(line);
    const g = (i: number) => (i >= 0 ? c[i] : undefined);

    const product = g(iProd);
    if (!product) continue;

    const price = parseInt(String(g(iPrice) ?? "").replace(/\D/g, ""), 10) || 0;
    if (price <= 0) continue;

    const qty = parseInt(String(g(iQty) ?? "1").replace(/\D/g, ""), 10) || 1;

    let status: OrderStatus = "DELIVERED";
    const rawStatus = String(g(iStatus) ?? "DELIVERED").trim().toUpperCase();
    if (VALID_STATUS.includes(rawStatus as OrderStatus)) status = rawStatus as OrderStatus;

    let dateStr = g(iDate) || new Date().toISOString().slice(0, 10);
    let date: string;
    try {
      const d = /^\d{4}-\d{2}-\d{2}/.test(dateStr)
        ? new Date(dateStr + "T12:00:00")
        : new Date(dateStr);
      date = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      date = new Date().toISOString();
    }

    const income =
      iIncome >= 0 && g(iIncome)
        ? parseInt(String(g(iIncome)).replace(/\D/g, ""), 10)
        : status === "REFUNDED"
          ? 0
          : Math.round((price * qty * 92) / 100);

    out.push({
      id: uid(),
      no: g(iNo) || "OD-IMPORT",
      product,
      game: g(iGame) || "-",
      price,
      qty,
      income: income || 0,
      status,
      date,
    });
  }
  return out;
}

export function toCSV(orders: Order[]): string {
  const rows = [
    ["order_number", "product_name", "game_name", "price", "quantity", "order_income", "status", "order_created_at"],
    ...orders.map((o) => [
      o.no,
      o.product,
      o.game,
      String(o.price),
      String(o.qty),
      String(o.income),
      o.status,
      o.date.slice(0, 10),
    ]),
  ];
  return rows
    .map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(","))
    .join("\n");
}

export function downloadCSV(orders: Order[]): void {
  const blob = new Blob(["\ufeff" + toCSV(orders)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "recehshopp-penjualan-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
