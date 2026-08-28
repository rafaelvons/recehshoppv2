import { useEffect, useMemo, useState } from "react";
import { Check, MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";
import { api, type Barang } from "../lib/api";

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function UbahHargaPage() {
  const [items, setItems] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api
      .getBarang()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (b) =>
        b.nama_item.toLowerCase().includes(q) ||
        b.nama_game.toLowerCase().includes(q) ||
        b.nama_tipe.toLowerCase().includes(q)
    );
  }, [items, search]);

  const startEdit = (b: Barang) => {
    setEditing((prev) => ({ ...prev, [b.id]: String(b.harga_jual) }));
  };

  const save = async (b: Barang) => {
    const raw = editing[b.id];
    const value = Number(raw.replace(/\./g, "").replace(/[^0-9]/g, ""));
    if (!value || value < 0) return;
    setSaving((prev) => ({ ...prev, [b.id]: true }));
    try {
      await api.updateHarga(b.id, value);
      setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, harga_jual: value, harga_asli: Math.round(value / 0.88) } : x)));
      setEditing((prev) => {
        const next = { ...prev };
        delete next[b.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving((prev) => ({ ...prev, [b.id]: false }));
    }
  };

  if (loading) return <div className="py-20 text-center font-black">Memuat barang...</div>;
  if (error) return <div className="py-20 text-center font-black text-bad">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-2 border-line bg-surface p-4 sm:flex-row sm:items-center">
        <h2 className="text-lg font-black uppercase tracking-tight">Ubah Harga Jual</h2>
        <div className="flex-1" />
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari barang..."
            className="h-10 w-full border-2 border-line bg-bg pl-9 pr-3 text-sm font-semibold sm:w-72"
          />
        </div>
      </div>

      <div className="overflow-x-auto border-2 border-line bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b-2 border-line bg-bg">
            <tr className="font-black uppercase tracking-wide">
              <th className="px-4 py-3">Game</th>
              <th className="px-4 py-3">Nama Item</th>
              <th className="px-4 py-3 text-right">Harga Itemku (estimasi)</th>
              <th className="px-4 py-3 text-right">Harga Jual (-12%)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/30">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-surface-2">
                <td className="px-4 py-3 font-bold">{b.nama_game}</td>
                <td className="px-4 py-3 font-semibold">{b.nama_item}</td>
                <td className="px-4 py-3 text-right text-ink-2">{formatRupiah(b.harga_asli)}</td>
                <td className="px-4 py-3 text-right">
                  {editing[b.id] !== undefined ? (
                    <input
                      type="number"
                      value={editing[b.id]}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [b.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && save(b)}
                      className="w-32 border-2 border-line bg-bg px-2 py-1 text-right font-bold"
                      autoFocus
                    />
                  ) : (
                    <span className="font-black text-brand-strong">{formatRupiah(b.harga_jual)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editing[b.id] !== undefined ? (
                    <button
                      onClick={() => save(b)}
                      disabled={saving[b.id]}
                      className="grid h-8 w-8 place-items-center border-2 border-line bg-ok text-bg transition-all hover:bg-ink disabled:opacity-60"
                    >
                      <Check size={14} weight="bold" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(b)}
                      className="grid h-8 w-8 place-items-center border-2 border-line bg-surface-2 text-ink transition-all hover:bg-ink hover:text-bg"
                    >
                      <PencilSimple size={14} weight="bold" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-10 text-center text-sm font-bold text-ink-3">Tidak ada barang</div>}
      </div>
    </div>
  );
}
