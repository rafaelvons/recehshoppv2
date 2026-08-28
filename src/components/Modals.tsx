import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, CheckCircle, X } from "@phosphor-icons/react";
import type { Order, OrderStatus } from "../types";
import { parseCSV } from "../lib/csv";
import {
  clearCredentials,
  fetchItemkuOrders,
  loadCredentials,
  saveCredentials,
} from "../lib/itemku";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const inputCls =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm transition-colors hover:border-line-strong";
const labelCls = "text-xs font-semibold text-ink-2";

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-modal-fade fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-pop w-full max-w-[440px] rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Tutup"
      className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink active:scale-[.95]"
    >
      <X size={16} />
    </button>
  );
}

/* ============ TAMBAH PESANAN ============ */
export function AddOrderModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (o: Order) => void;
}) {
  const [product, setProduct] = useState("");
  const [game, setGame] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [status, setStatus] = useState<OrderStatus>("DELIVERED");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => ref.current?.focus(), []);

  const submit = () => {
    const p = product.trim();
    const priceNum = parseInt(price, 10);
    const qtyNum = parseInt(qty, 10) || 1;
    if (!p || !priceNum || priceNum <= 0) return;

    onAdd({
      id: uid(),
      no: "OD" + (1000000 + Math.floor(Math.random() * 900000)),
      product: p,
      game: game.trim() || "-",
      price: priceNum,
      qty: qtyNum,
      income: status === "REFUNDED" ? 0 : Math.round((priceNum * qtyNum * 92) / 100),
      status,
      date: new Date(date + "T12:00:00").toISOString(),
    });
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <div className="relative">
        <CloseButton onClose={onClose} />
        <div className="mb-1 text-base font-bold">Tambah pesanan</div>
        <p className="mb-5 text-xs text-ink-3">
          Isi data penjualan baru, atau gunakan tombol Import untuk data banyak sekaligus.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="fProduct">Nama produk</label>
            <input ref={ref} id="fProduct" className={inputCls} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="cth: Diamond 86" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="fGame">Game / kategori</label>
            <input id="fGame" className={inputCls} value={game} onChange={(e) => setGame(e.target.value)} placeholder="cth: Mobile Legends" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="fStatus">Status</label>
            <select id="fStatus" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              <option value="DELIVERED">Selesai</option>
              <option value="REQUIRE_PROCESS">Diproses</option>
              <option value="REFUNDED">Refund</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="fPrice">Harga jual (Rp)</label>
            <input id="fPrice" type="number" min="0" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="100000" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="fQty">Jumlah</label>
            <input id="fQty" type="number" min="1" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="fDate">Tanggal</label>
            <input id="fDate" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink active:scale-[.98]">
            Batal
          </button>
          <button onClick={submit} className="rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-[#082f49] shadow-[0_4px_14px_-6px_var(--color-brand)] transition-colors hover:bg-brand-strong active:scale-[.98]">
            Simpan
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ============ TARIK DARI ITEMKU ============ */
const RANGE_DAYS = [7, 30, 60];

export function SyncModal({
  onClose,
  onSync,
}: {
  onClose: () => void;
  onSync: (orders: Order[], rawCount: number) => void;
}) {
  const saved = loadCredentials();
  const [apiKey, setApiKey] = useState(saved.apiKey);
  const [apiSecret, setApiSecret] = useState(saved.apiSecret);
  const [remember, setRemember] = useState(!!saved.apiKey);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const key = apiKey.trim();
    const secret = apiSecret.trim();
    if (!key || !secret) {
      setError("Isi API Key dan Secret Key dulu.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (remember) saveCredentials({ apiKey: key, apiSecret: secret });
      else clearCredentials();

      const start = new Date();
      start.setDate(start.getDate() - (days - 1));
      const dateStart = start.toISOString().slice(0, 10);

      const { orders, rawCount } = await fetchItemkuOrders({ apiKey: key, apiSecret: secret }, dateStart, 30);
      if (orders.length === 0) {
        setError("Tidak ada order baru pada periode ini. Maksimal 60 hari ke belakang.");
        return;
      }
      onSync(orders, rawCount);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menarik data dari itemku.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="relative">
        <CloseButton onClose={onClose} />
        <div className="mb-1 text-base font-bold">Tarik pesanan</div>
        <p className="mb-5 text-xs text-ink-3">
          Masukkan kredensial Tokoku API (itemku seller), lalu tarik order terbaru ke dashboard RecehShopp.
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="sKey">API Key</label>
            <input
              id="sKey"
              className={inputCls}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="X-Api-Key dari itemku"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="sSecret">Secret Key</label>
            <input
              id="sSecret"
              type="password"
              className={inputCls}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="API Secret untuk tanda tangan JWT"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelCls}>Rentang waktu</span>
            <div className="inline-flex gap-0.5 self-start rounded-lg border border-line bg-surface-2 p-1">
              {RANGE_DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    days === d ? "bg-ink text-bg shadow-sm" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {d} hari
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-3">Maksimal 60 hari ke belakang (batas API).</p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            Ingat kredensial di browser ini
          </label>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink active:scale-[.98]">
            Batal
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-[#082f49] shadow-[0_4px_14px_-6px_var(--color-brand)] transition-colors hover:bg-brand-strong active:scale-[.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? <ArrowClockwise size={15} weight="bold" className="animate-spin" /> : <CheckCircle size={15} weight="bold" />}
            {loading ? "Menarik..." : "Tarik pesanan"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ============ IMPORT CSV ============ */
export function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (orders: Order[]) => void;
}) {
  const [text, setText] = useState("");

  const submit = () => {
    const parsed = parseCSV(text);
    if (!parsed.length) return;
    onImport(parsed);
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <div className="relative">
        <CloseButton onClose={onClose} />
        <div className="mb-1 text-base font-bold">Import pesanan</div>
        <p className="mb-5 text-xs text-ink-3">
          Tempel data CSV, lalu klik Import. Format kolom bebas, tapi wajib ada nama produk dan harga.
        </p>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls} htmlFor="importText">Data CSV</label>
          <textarea
            id="importText"
            className={inputCls + " min-h-[130px] resize-y font-mono text-xs"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"product_name,game_name,price,quantity,status,order_created_at\nDiamond 86,Mobile Legends,100000,1,DELIVERED,2026-08-15"}
            spellCheck={false}
          />
        </div>

        <div className="mt-3 rounded-lg border border-dashed border-line-strong bg-bg px-3 py-2.5 text-xs leading-relaxed text-ink-3">
          Kolom yang dikenali: <code className="font-mono text-ink-2">product_name</code>,{" "}
          <code className="font-mono text-ink-2">game_name</code>,{" "}
          <code className="font-mono text-ink-2">price</code>,{" "}
          <code className="font-mono text-ink-2">quantity</code>,{" "}
          <code className="font-mono text-ink-2">order_income</code>,{" "}
          <code className="font-mono text-ink-2">status</code>,{" "}
          <code className="font-mono text-ink-2">order_created_at</code> (atau{" "}
          <code className="font-mono text-ink-2">date</code>).
          <br />
          Status: <code className="font-mono text-ink-2">DELIVERED</code>,{" "}
          <code className="font-mono text-ink-2">REQUIRE_PROCESS</code>,{" "}
          <code className="font-mono text-ink-2">REFUNDED</code>. Baris tanpa status dianggap{" "}
          <code className="font-mono text-ink-2">DELIVERED</code>.
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink active:scale-[.98]">
            Batal
          </button>
          <button onClick={submit} className="rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-[#082f49] shadow-[0_4px_14px_-6px_var(--color-brand)] transition-colors hover:bg-brand-strong active:scale-[.98]">
            Import
          </button>
        </div>
      </div>
    </Overlay>
  );
}
