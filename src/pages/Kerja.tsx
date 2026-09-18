import { useEffect, useMemo, useRef, useState } from "react";
import { Trash, Users, UserCheck, MagnifyingGlass, CaretDown, Check } from "@phosphor-icons/react";
import { api, type Barang, type LogKerja, type User } from "../lib/api";
import { useAuth } from "../lib/auth";

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function KerjaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Barang[]>([]);
  const [logs, setLogs] = useState<LogKerja[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [selectedItem, setSelectedItem] = useState<Barang | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [deskripsi, setDeskripsi] = useState("");
  const [qty, setQty] = useState<string>("1");
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [filterView, setFilterView] = useState<"mine" | "all">("mine");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getBarang().then(setItems).catch(console.error);
    api.getLogs().then(setLogs).catch(console.error);
    api.getProfiles().then(setProfiles).catch(console.error);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Default logged in user in worker selection
  useEffect(() => {
    if (user?.id && selectedWorkers.length === 0) {
      setSelectedWorkers([user.id]);
    }
  }, [user, selectedWorkers.length]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter(
      (b) =>
        b.nama_item.toLowerCase().includes(q) ||
        b.nama_game.toLowerCase().includes(q)
    );
  }, [items, itemSearch]);

  const workerCount = Math.max(1, selectedWorkers.length);

  const grossTotal = useMemo(() => {
    const q = Number(qty) || 0;
    return selectedItem ? q * selectedItem.harga_jual : 0;
  }, [qty, selectedItem]);

  const perWorkerShare = useMemo(() => {
    return Math.round(grossTotal / workerCount);
  }, [grossTotal, workerCount]);

  const toggleWorker = (id: string) => {
    setSelectedWorkers((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least 1
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedItem || !deskripsi.trim() || !Number(qty)) {
      setError("Pilih barang, lengkapi deskripsi, dan qty");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.createLog({
        user_id: user.id,
        barang_id: selectedItem.id,
        deskripsi: deskripsi.trim(),
        qty: Number(qty),
        worker_user_ids: selectedWorkers,
      });
      setDeskripsi("");
      setQty("1");
      setSelectedItem(null);
      setItemSearch("");
      setMsg(
        res.count > 1
          ? `Log kerja berhasil di-split ke ${res.count} pegawai (${formatRupiah(res.totalPerPerson)} / orang)`
          : "Log kerja tersimpan"
      );
      setTimeout(() => setMsg(null), 3500);
      setLogs(await api.getLogs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus log ini?")) return;
    await api.deleteLog(id);
    setLogs(await api.getLogs());
  };

  const displayedLogs = useMemo(() => {
    if (filterView === "mine" && user?.username) {
      const myName = user.username.toLowerCase();
      return logs.filter(
        (l) =>
          l.username.toLowerCase() === myName ||
          l.deskripsi.toLowerCase().includes(myName)
      );
    }
    return logs;
  }, [logs, filterView, user?.username]);

  const totalSum = useMemo(() => {
    return displayedLogs.reduce((sum, l) => {
      if (filterView === "mine" && user?.username) {
        const match = l.deskripsi.match(/\[Split\s+(\d+)\s+Pegawai/i);
        const count = match ? Number(match[1]) : 1;
        return sum + Math.round(l.total / count);
      }
      return sum + l.total;
    }, 0);
  }, [displayedLogs, filterView, user?.username]);

  return (
    <div className="space-y-4">
      <div className="border-2 border-line bg-surface p-4">
        <h2 className="text-lg font-black uppercase tracking-tight">Catat Log Kerja & Pembagian Hasil</h2>
        <p className="text-[12px] font-bold text-ink-3">
          Cari barang/jasa dari daftar, tentukan pegawai yang mengerjakan, dan porsi hasil akan terhitung otomatis.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border-2 border-line bg-surface p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Searchable Barang Combobox */}
          <div className="relative sm:col-span-2" ref={dropdownRef}>
            <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide">
              Cari & Pilih Barang / Jasa
            </label>
            <div
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-between border-2 border-line bg-bg px-3 py-2.5 text-sm font-semibold"
            >
              {selectedItem ? (
                <span>
                  <span className="font-extrabold text-ink-3">[{selectedItem.nama_game}]</span>{" "}
                  {selectedItem.nama_item} —{" "}
                  <span className="font-black text-brand-strong">{formatRupiah(selectedItem.harga_jual)}</span>
                </span>
              ) : (
                <span className="text-ink-3">Ketik / Klik untuk memilih dari 117 barang...</span>
              )}
              <CaretDown size={16} weight="bold" className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </div>

            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto border-2 border-line bg-bg shadow-2xl">
                <div className="sticky top-0 border-b-2 border-line bg-surface-2 p-2">
                  <div className="relative">
                    <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                    <input
                      type="text"
                      autoFocus
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Cari nama barang atau nama game..."
                      className="w-full border-2 border-line bg-bg py-1.5 pl-9 pr-3 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="divide-y divide-line/30">
                  {filteredItems.map((b) => {
                    const isSelected = selectedItem?.id === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedItem(b);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex cursor-pointer items-center justify-between px-3 py-2 text-xs transition-all hover:bg-brand/20 ${
                          isSelected ? "bg-brand/30 font-bold" : ""
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-ink-3">[{b.nama_game}]</span> {b.nama_item}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-brand-strong">{formatRupiah(b.harga_jual)}</span>
                          {isSelected && <Check size={14} weight="bold" className="text-brand-strong" />}
                        </div>
                      </div>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <div className="p-4 text-center text-xs font-bold text-ink-3">Barang tidak ditemukan</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide">Nama Pembeli</label>
            <input
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Masukkan nama pembeli / buyer..."
              className="w-full border-2 border-line bg-bg px-3 py-2.5 text-sm font-semibold"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide">Qty / Jumlah Run</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full border-2 border-line bg-bg px-3 py-2.5 text-sm font-semibold"
              required
            />
          </div>
        </div>

        {/* Tim / Pegawai yang terlibat */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide">
            <Users size={16} weight="bold" />
            Tim Pekerja (Pilih siapa saja yang ngerjain)
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {profiles.map((p) => {
              const isSelected = selectedWorkers.includes(p.id);
              const isMe = p.id === user?.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleWorker(p.id)}
                  className={`flex items-center gap-1.5 border-2 px-3 py-1.5 text-[12px] font-extrabold transition-all ${
                    isSelected
                      ? "border-line bg-brand text-bg shadow-[2px_2px_0px_0px_var(--color-line)]"
                      : "border-line/40 bg-bg text-ink hover:border-line"
                  }`}
                >
                  <UserCheck size={14} weight={isSelected ? "bold" : "regular"} />
                  {p.username} {isMe ? "(Saya)" : ""}
                </button>
              );
            })}
          </div>
          {workerCount > 1 && (
            <p className="mt-2 text-[11px] font-bold text-ink-3">
              * Pekerjaan ini dilakukan bersama {workerCount} orang. Hasil akan dibagi {workerCount} secara otomatis.
            </p>
          )}
        </div>

        {selectedItem && (
          <div className="grid gap-2 border-2 border-line bg-bg p-4 sm:grid-cols-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-3">Total Transaksi</div>
              <div className="text-base font-black">{formatRupiah(grossTotal)}</div>
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-3">Jumlah Pekerja</div>
              <div className="text-base font-black">{workerCount} Orang</div>
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-3">Porsi / Pegawai</div>
              <div className="text-lg font-black text-brand-strong">{formatRupiah(perWorkerShare)}</div>
            </div>
          </div>
        )}

        {error && <div className="border-2 border-line-strong bg-bad/10 px-3 py-2 text-[12px] font-bold text-bad">{error}</div>}
        {msg && <div className="border-2 border-line-strong bg-ok/10 px-3 py-2 text-[12px] font-bold text-ok">{msg}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full border-2 border-line bg-brand py-3 text-sm font-extrabold uppercase tracking-wide text-bg shadow-[4px_4px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
        >
          {loading
            ? "Menyimpan..."
            : workerCount > 1
            ? `Simpan & Split Ke ${workerCount} Pegawai`
            : "Simpan Log Kerja"}
        </button>
      </form>

      {/* Tabel Log Kerja */}
      <div className="border-2 border-line bg-surface p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black uppercase tracking-tight">Riwayat Log Kerja</h3>
            <div className="flex items-center gap-1 border-2 border-line bg-bg p-0.5">
              <button
                onClick={() => setFilterView("mine")}
                className={`px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide transition-all ${
                  filterView === "mine" ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"
                }`}
              >
                Log Saya
              </button>
              <button
                onClick={() => setFilterView("all")}
                className={`px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide transition-all ${
                  filterView === "all" ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"
                }`}
              >
                Semua Pegawai
              </button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-3">Total Pendapatan</div>
            <div className="text-lg font-black text-brand-strong">{formatRupiah(totalSum)}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b-2 border-line bg-bg">
              <tr className="font-black uppercase tracking-wide">
                <th className="px-3 py-2">Pembuat Log</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Game & Item</th>
                <th className="px-3 py-2">Nama Pembeli & Info Split</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Total / Porsi</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/30">
              {displayedLogs.map((l) => {
                const isMine = l.username === user?.username;
                const match = l.deskripsi.match(/\[Split\s+(\d+)\s+Pegawai/i);
                const splitCount = match ? Number(match[1]) : 1;
                const porsiPerPerson = Math.round(l.total / splitCount);

                return (
                  <tr key={l.id} className="hover:bg-surface-2">
                    <td className="px-3 py-2 font-bold">
                      <span className={`inline-block px-1.5 py-0.5 text-[11px] ${isMine ? "bg-brand/20 text-brand-strong" : "bg-surface-2"}`}>
                        {l.username}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink-2">{new Date(l.created_at).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 font-semibold">
                      <span className="text-ink-3">[{l.nama_game}]</span> {l.nama_item}
                    </td>
                    <td className="px-3 py-2">{l.deskripsi}</td>
                    <td className="px-3 py-2 text-right font-bold">{l.qty}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="font-black text-brand-strong">{formatRupiah(l.total)}</div>
                      {splitCount > 1 && (
                        <div className="text-[10px] font-bold text-ink-3">
                          Porsi: {formatRupiah(porsiPerPerson)} / org
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isMine && (
                        <button onClick={() => handleDelete(l.id)} className="text-bad hover:text-ink" title="Hapus log">
                          <Trash size={16} weight="bold" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {displayedLogs.length === 0 && <div className="py-6 text-center text-sm font-bold text-ink-3">Belum ada log kerja</div>}
        </div>
      </div>
    </div>
  );
}
