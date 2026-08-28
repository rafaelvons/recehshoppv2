import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { api, type Barang } from "../lib/api";

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function BarangPage() {
  const [items, setItems] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [game, setGame] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [namaGame, setNamaGame] = useState("");
  const [namaItem, setNamaItem] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [stok, setStok] = useState("0");
  const [tipe, setTipe] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .getBarang()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const games = useMemo(
    () => Array.from(new Set(items.map((i) => i.nama_game).filter(Boolean))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((b) => {
      const matchGame = game === "all" || b.nama_game === game;
      const matchSearch =
        !q ||
        b.nama_item.toLowerCase().includes(q) ||
        b.nama_game.toLowerCase().includes(q) ||
        b.nama_tipe.toLowerCase().includes(q);
      return matchGame && matchSearch;
    });
  }, [items, search, game]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const game = namaGame.trim();
    const item = namaItem.trim();
    const harga = parseInt(hargaJual.replace(/\D/g, ""), 10);
    const s = parseInt(stok, 10) || 0;

    if (!game || !item || !harga || harga <= 0) {
      setFormError("Nama game, nama item, dan harga jual wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const baru = await api.createBarang({
        nama_game: game,
        nama_item: item,
        harga_jual: harga,
        stok: s,
        nama_tipe: tipe,
      });
      setItems((prev) => [...prev, baru].sort((a, b) => a.nama_game.localeCompare(b.nama_game)));
      setNamaGame("");
      setNamaItem("");
      setHargaJual("");
      setStok("0");
      setTipe("");
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan barang");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center font-black">Memuat barang...</div>;
  if (error) return <div className="py-20 text-center font-black text-bad">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-4 border-line bg-surface p-4 shadow-[6px_6px_0px_0px_var(--color-line)] sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight">Daftar Barang</h2>
          <div className="text-[11px] font-black uppercase tracking-widest text-ink-3">
            {items.length} barang tersimpan
          </div>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari barang..."
            className="h-10 w-full border-2 border-line bg-bg pl-9 pr-3 text-sm font-semibold sm:w-64"
          />
        </div>
        <select
          value={game}
          onChange={(e) => setGame(e.target.value)}
          className="h-10 border-2 border-line bg-bg px-3 text-sm font-semibold"
        >
          <option value="all">Semua Game</option>
          {games.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex h-10 items-center gap-2 border-2 border-line bg-brand px-4 text-[12px] font-extrabold uppercase tracking-wide text-bg shadow-[3px_3px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-y-0.5"
        >
          <Plus size={16} weight="bold" />
          Tambah
        </button>
      </div>

      {/* Form Tambah Barang */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-4 border-line bg-surface p-4 shadow-[6px_6px_0px_0px_var(--color-line)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-base font-black uppercase tracking-tight">Tambah Barang Baru</div>
              <div className="text-[11px] font-black uppercase tracking-widest text-ink-3">
                Harga asli itemku otomatis +12% dari harga jual
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="grid h-9 w-9 place-items-center border-2 border-line bg-bg text-ink-3 transition-all hover:bg-bad/10 hover:text-bad"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-ink-2">Nama Game</label>
              <input
                value={namaGame}
                onChange={(e) => setNamaGame(e.target.value)}
                placeholder="cth: Mobile Legends"
                className="h-10 border-2 border-line bg-bg px-3 text-sm font-semibold"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-ink-2">Tipe / Kategori</label>
              <input
                value={tipe}
                onChange={(e) => setTipe(e.target.value)}
                placeholder="cth: Diamond"
                className="h-10 border-2 border-line bg-bg px-3 text-sm font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-black uppercase tracking-wide text-ink-2">Nama Item</label>
              <input
                value={namaItem}
                onChange={(e) => setNamaItem(e.target.value)}
                placeholder="cth: 86 Diamonds"
                className="h-10 border-2 border-line bg-bg px-3 text-sm font-semibold"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-ink-2">Harga Jual (Rp)</label>
              <input
                type="number"
                min={1}
                value={hargaJual}
                onChange={(e) => setHargaJual(e.target.value)}
                placeholder="100000"
                className="h-10 border-2 border-line bg-bg px-3 text-sm font-semibold"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-ink-2">Stok Awal</label>
              <input
                type="number"
                min={0}
                value={stok}
                onChange={(e) => setStok(e.target.value)}
                className="h-10 border-2 border-line bg-bg px-3 text-sm font-semibold"
              />
            </div>
          </div>

          {formError && (
            <div className="mt-3 border-2 border-line-strong bg-bad/10 px-3 py-2 text-[12px] font-bold text-bad">
              {formError}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-10 border-2 border-line bg-bg px-4 text-[12px] font-extrabold uppercase tracking-wide text-ink-2 transition-all hover:bg-surface-2 hover:text-ink"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 border-2 border-line bg-brand px-4 text-[12px] font-extrabold uppercase tracking-wide text-bg shadow-[3px_3px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan Barang"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto border-2 border-line bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b-2 border-line bg-bg">
            <tr className="font-black uppercase tracking-wide">
              <th className="px-4 py-3">Game</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Nama Item</th>
              <th className="px-4 py-3 text-right">Harga Itemku</th>
              <th className="px-4 py-3 text-right">Harga Jual (-12%)</th>
              <th className="px-4 py-3 text-right">Stok</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/30">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-surface-2">
                <td className="px-4 py-3 font-bold">{b.nama_game}</td>
                <td className="px-4 py-3 text-ink-2">{b.nama_tipe || "-"}</td>
                <td className="px-4 py-3 font-semibold">{b.nama_item}</td>
                <td className="px-4 py-3 text-right text-ink-2">{formatRupiah(b.harga_asli)}</td>
                <td className="px-4 py-3 text-right font-black text-brand-strong">{formatRupiah(b.harga_jual)}</td>
                <td className="px-4 py-3 text-right">{b.stok.toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm font-bold text-ink-3">Tidak ada barang</div>
        )}
      </div>
    </div>
  );
}
