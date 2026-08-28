import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
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

  useEffect(() => {
    api
      .getBarang()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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

  if (loading) return <div className="py-20 text-center font-black">Memuat barang...</div>;
  if (error) return <div className="py-20 text-center font-black text-bad">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-2 border-line bg-surface p-4 sm:flex-row sm:items-center">
        <h2 className="text-lg font-black uppercase tracking-tight">Daftar Barang</h2>
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
      </div>

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
                <td className="px-4 py-3 text-ink-2">{b.nama_tipe}</td>
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
