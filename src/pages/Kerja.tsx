import { useEffect, useMemo, useRef, useState } from "react";
import { Trash, Users, UserCheck, MagnifyingGlass, CaretDown, Plus, Minus, X, ClockCounterClockwise } from "@phosphor-icons/react";
import { api, checkIsAdmin, type Barang, type LogKerja, type User } from "../lib/api";
import { useAuth } from "../lib/auth";

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

/** Ambil nama pembeli asli dari deskripsi (buang tag "[Split ...]") */
function buyerFromDeskripsi(deskripsi: string): string {
  return deskripsi.replace(/\s*\[Split[^\]]*\]\s*$/i, "").trim();
}

interface CartLine {
  barang: Barang;
  qty: string;
}

export default function KerjaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Barang[]>([]);
  const [logs, setLogs] = useState<LogKerja[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [deskripsi, setDeskripsi] = useState("");
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

  const grossTotal = useMemo(
    () => cart.reduce((sum, l) => sum + (Number(l.qty) || 0) * l.barang.harga_jual, 0),
    [cart]
  );

  const perWorkerShare = useMemo(() => {
    return Math.round(grossTotal / workerCount);
  }, [grossTotal, workerCount]);

  // Daftar pembeli yang pernah dicatat (terbaru dulu) untuk isian otomatis
  const pastBuyers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const l of logs) {
      const name = buyerFromDeskripsi(l.deskripsi);
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    }
    return Array.from(seen.values());
  }, [logs]);

  const addToCart = (b: Barang) => {
    setCart((prev) => {
      const found = prev.find((l) => l.barang.id === b.id);
      if (found) {
        return prev.map((l) => (l.barang.id === b.id ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l));
      }
      return [...prev, { barang: b, qty: "1" }];
    });
    setIsDropdownOpen(false);
    setItemSearch("");
  };

  const setLineQty = (id: number, value: string) =>
    setCart((prev) => prev.map((l) => (l.barang.id === id ? { ...l, qty: value } : l)));

  const bumpLineQty = (id: number, delta: number) =>
    setCart((prev) =>
      prev.map((l) => (l.barang.id === id ? { ...l, qty: String(Math.max(1, (Number(l.qty) || 0) + delta)) } : l))
    );

  const removeLine = (id: number) => setCart((prev) => prev.filter((l) => l.barang.id !== id));

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
    if (!deskripsi.trim()) {
      setError("Isi nama pembeli dulu");
      return;
    }
    if (cart.length === 0) {
      setError("Pilih minimal 1 barang");
      return;
    }
    if (cart.some((l) => !(Number(l.qty) > 0))) {
      setError("Qty setiap barang minimal 1");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.createLogs({
        user_id: user.id,
        deskripsi: deskripsi.trim(),
        items: cart.map((l) => ({ barang_id: l.barang.id, qty: Number(l.qty) })),
        worker_user_ids: selectedWorkers,
      });
      setDeskripsi("");
      setCart([]);
      setItemSearch("");
      const barangInfo = res.jumlahBarang > 1 ? `${res.jumlahBarang} barang` : "1 barang";
      setMsg(
        res.count > 1
          ? `Log kerja (${barangInfo}) di-split ke ${res.count} pegawai (${formatRupiah(res.totalPerPerson)} / orang)`
          : `Log kerja tersimpan (${barangInfo}, ${formatRupiah(res.grandTotal)})`
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
        <div className="grid gap-4">
          {/* Nama Pembeli — sekali isi untuk semua barang */}
          <div>
            <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide">Nama Pembeli</label>
            <input
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              list="pembeli-list"
              placeholder="Ketik nama pembeli / buyer (otomatis muncul kalau pernah dicatat)..."
              className="w-full border-2 border-line bg-bg px-3 py-2.5 text-sm font-semibold"
              autoComplete="off"
              required
            />
            <datalist id="pembeli-list">
              {pastBuyers.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            {pastBuyers.length > 0 && !deskripsi && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-3">
                  <ClockCounterClockwise size={12} weight="bold" /> Pembeli terakhir:
                </span>
                {pastBuyers.slice(0, 6).map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setDeskripsi(n)}
                    className="border-2 border-line/40 bg-bg px-2 py-0.5 text-[11px] font-bold hover:border-line"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Searchable Barang Combobox — klik barang untuk menambahkan ke daftar */}
          <div className="relative" ref={dropdownRef}>
            <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide">
              Tambah Barang / Jasa (bisa lebih dari satu)
            </label>
            <div
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-between border-2 border-line bg-bg px-3 py-2.5 text-sm font-semibold"
            >
              <span className="flex items-center gap-2 text-ink-3">
                <Plus size={14} weight="bold" />
                Klik untuk pilih dari {items.length} barang...
              </span>
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
                    const inCart = cart.find((l) => l.barang.id === b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => addToCart(b)}
                        className={`flex cursor-pointer items-center justify-between px-3 py-2 text-xs transition-all hover:bg-brand/20 ${
                          inCart ? "bg-brand/30 font-bold" : ""
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-ink-3">[{b.nama_game}]</span> {b.nama_item}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-brand-strong">{formatRupiah(b.harga_jual)}</span>
                          {inCart && <span className="text-[10px] font-black text-brand-strong">×{inCart.qty}</span>}
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

          {/* Daftar barang yang dipilih */}
          {cart.length > 0 && (
            <div className="divide-y divide-line/30 border-2 border-line bg-bg">
              {cart.map((l) => {
                const subtotal = (Number(l.qty) || 0) * l.barang.harga_jual;
                return (
                  <div key={l.barang.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">
                        <span className="font-extrabold text-ink-3">[{l.barang.nama_game}]</span> {l.barang.nama_item}
                      </div>
                      <div className="text-[11px] font-semibold text-ink-3">{formatRupiah(l.barang.harga_jual)} / run</div>
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => bumpLineQty(l.barang.id, -1)}
                        className="grid h-8 w-8 place-items-center border-2 border-line bg-surface-2 hover:bg-ink hover:text-bg"
                        aria-label="Kurangi qty"
                      >
                        <Minus size={12} weight="bold" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => setLineQty(l.barang.id, e.target.value)}
                        className="h-8 w-14 border-y-2 border-line bg-bg text-center text-sm font-bold"
                        aria-label="Qty"
                      />
                      <button
                        type="button"
                        onClick={() => bumpLineQty(l.barang.id, 1)}
                        className="grid h-8 w-8 place-items-center border-2 border-line bg-surface-2 hover:bg-ink hover:text-bg"
                        aria-label="Tambah qty"
                      >
                        <Plus size={12} weight="bold" />
                      </button>
                    </div>
                    <div className="w-28 text-right font-black text-brand-strong">{formatRupiah(subtotal)}</div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.barang.id)}
                      className="grid h-8 w-8 place-items-center text-bad hover:text-ink"
                      aria-label="Hapus barang"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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

        {cart.length > 0 && (
          <div className="grid gap-2 border-2 border-line bg-bg p-4 sm:grid-cols-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-3">
                Total Transaksi ({cart.length} barang)
              </div>
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
                const isAdmin = checkIsAdmin(user?.username);
                const canDelete = isMine || isAdmin;
                const match = l.deskripsi.match(/\[Split\s+(\d+)\s+Pegawai/i);
                const splitCount = match ? Number(match[1]) : 1;
                const porsiPerPerson = Math.round(l.total / splitCount);

                return (
                  <tr key={l.id} className="hover:bg-surface-2">
                    <td className="px-3 py-2 font-bold">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] ${isMine ? "bg-brand/20 text-brand-strong" : "bg-surface-2"}`}>
                        {l.username}
                        {checkIsAdmin(l.username) && (
                          <span className="text-[9px] font-black text-brand uppercase">[ADMIN]</span>
                        )}
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
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="text-bad hover:text-ink"
                          title={isAdmin && !isMine ? "Hapus log (Admin)" : "Hapus log"}
                        >
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
