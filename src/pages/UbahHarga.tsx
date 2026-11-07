import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  DownloadSimple,
  FileXls,
  MagnifyingGlass,
  PencilSimple,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { api, type Barang } from "../lib/api";
import {
  ITEMKU_HEADERS,
  buildPreview,
  downloadItemkuExcel,
  parseItemkuExcel,
  type PreviewRow,
} from "../lib/hargaExcel";

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const STATUS_LABEL: Record<PreviewRow["status"], string> = {
  ubah: "Harga berubah",
  baru: "Barang baru",
  sama: "Tidak berubah",
};

export default function UbahHargaPage() {
  const [items, setItems] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  // Upload Excel
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [includeNew, setIncludeNew] = useState(true);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const load = () =>
    api
      .getBarang()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
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
    setEditing((prev) => ({ ...prev, [b.id]: String(b.harga_asli) }));
  };

  const cancelEdit = (id: number) =>
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const parseHarga = (raw: string | undefined) => Number((raw ?? "").replace(/[^0-9]/g, "")) || 0;

  const save = async (b: Barang) => {
    const value = parseHarga(editing[b.id]);
    if (!value || value <= 0) return;
    setSaving((prev) => ({ ...prev, [b.id]: true }));
    try {
      const res = await api.updateHargaItemku(b.id, value);
      setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...res } : x)));
      cancelEdit(b.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving((prev) => ({ ...prev, [b.id]: false }));
    }
  };

  // ---------- Upload Excel ----------

  const resetUpload = () => {
    setPreview(null);
    setSkipped([]);
    setFileName(null);
    setUploadError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploadMsg(null);
    try {
      const { rows, skipped } = await parseItemkuExcel(file);
      if (rows.length === 0) throw new Error("Tidak ada baris barang yang bisa dibaca di file ini");
      setFileName(file.name);
      setSkipped(skipped);
      setPreview(buildPreview(rows, items));
    } catch (err) {
      setPreview(null);
      setUploadError(err instanceof Error ? err.message : "Gagal membaca file Excel");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const counts = useMemo(() => {
    const c = { ubah: 0, baru: 0, sama: 0 };
    preview?.forEach((p) => c[p.status]++);
    return c;
  }, [preview]);

  const visiblePreview = useMemo(
    () =>
      (preview ?? []).filter((p) => {
        if (p.status === "sama") return showUnchanged;
        if (p.status === "baru") return includeNew || showUnchanged;
        return true;
      }),
    [preview, showUnchanged, includeNew]
  );

  const totalToApply = counts.ubah + (includeNew ? counts.baru : 0);

  const applyUpload = async () => {
    if (!preview || totalToApply === 0) return;
    setApplying(true);
    setUploadError(null);
    try {
      const updates = preview
        .filter((p) => p.status === "ubah" && p.existing)
        .map((p) => ({
          id: p.existing!.id,
          harga_asli: p.harga_asli_baru,
          harga_jual: p.harga_jual_baru,
          id_item: p.existing!.id_item == null ? p.row.id_item : undefined,
        }));
      const inserts = includeNew
        ? preview
            .filter((p) => p.status === "baru")
            .map(({ row, harga_asli_baru, harga_jual_baru }) => ({
              id_item: row.id_item,
              nama_game: row.nama_game,
              nama_tipe: row.nama_tipe,
              server_name: row.server_name,
              grup_name: row.grup_name,
              nama_item: row.nama_item,
              stok: row.stok,
              metode_pengiriman: row.metode_pengiriman,
              min_pesanan: row.min_pesanan,
              harga_asli: harga_asli_baru,
              harga_jual: harga_jual_baru,
            }))
        : [];

      const res = await api.applyHargaExcel(updates, inserts);
      const parts = [`${res.updated} harga diperbarui`];
      if (res.inserted) parts.push(`${res.inserted} barang baru ditambahkan`);
      setUploadMsg(parts.join(", "));
      if (res.failed.length) setUploadError(`Sebagian gagal:\n${res.failed.join("\n")}`);
      resetUploadKeepMsg();
      await load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setApplying(false);
    }
  };

  const resetUploadKeepMsg = () => {
    setPreview(null);
    setSkipped([]);
    setFileName(null);
  };

  if (loading) return <div className="py-20 text-center font-black">Memuat barang...</div>;
  if (error) return <div className="py-20 text-center font-black text-bad">{error}</div>;

  return (
    <div className="space-y-4">
      {/* ---------- Upload Excel ---------- */}
      <div className="space-y-3 border-2 border-line bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
              <FileXls size={22} weight="bold" /> Ubah Harga Lewat Excel
            </h2>
            <p className="text-[12px] font-bold text-ink-3">
              Upload file "ubah sekaligus" dari itemku. Kolom <b>Harga</b> = harga itemku, harga jual otomatis -12%.
            </p>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => downloadItemkuExcel(items)}
            className="inline-flex h-10 items-center justify-center gap-2 border-2 border-line bg-bg px-4 text-[12px] font-extrabold uppercase tracking-wide text-ink transition-all hover:bg-surface-2"
          >
            <DownloadSimple size={16} weight="bold" /> Download Excel
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 items-center justify-center gap-2 border-2 border-line bg-brand px-4 text-[12px] font-extrabold uppercase tracking-wide text-bg shadow-[3px_3px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            <UploadSimple size={16} weight="bold" /> Upload Excel
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {!preview && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-line/50 bg-bg px-4 py-6 text-center text-[12px] font-bold text-ink-3 hover:border-line"
          >
            Tarik file Excel ke sini, atau klik untuk pilih file.
            <div className="mt-1 font-mono text-[10px] text-ink-3">{ITEMKU_HEADERS.join(" | ")}</div>
          </div>
        )}

        {uploadMsg && (
          <div className="border-2 border-line-strong bg-ok/10 px-3 py-2 text-[12px] font-bold text-ok">{uploadMsg}</div>
        )}
        {uploadError && (
          <div className="whitespace-pre-line border-2 border-line-strong bg-bad/10 px-3 py-2 text-[12px] font-bold text-bad">
            {uploadError}
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-extrabold">
              <span className="text-ink-2">{fileName}:</span>
              <span className="border-2 border-line bg-brand/20 px-2 py-0.5">{counts.ubah} harga berubah</span>
              <span className="border-2 border-line bg-ok/15 px-2 py-0.5">{counts.baru} barang baru</span>
              <span className="border-2 border-line/40 px-2 py-0.5 text-ink-3">{counts.sama} tidak berubah</span>
              {skipped.length > 0 && (
                <span className="border-2 border-line bg-bad/10 px-2 py-0.5 text-bad">{skipped.length} baris dilewati</span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-[12px] font-bold">
              {counts.baru > 0 && (
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={includeNew} onChange={(e) => setIncludeNew(e.target.checked)} />
                  Tambahkan barang baru ke daftar barang
                </label>
              )}
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)} />
                Tampilkan yang tidak berubah
              </label>
            </div>

            {skipped.length > 0 && (
              <details className="text-[11px] font-bold text-ink-3">
                <summary className="cursor-pointer">Lihat baris yang dilewati</summary>
                <ul className="mt-1 list-disc pl-5">
                  {skipped.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </details>
            )}

            <div className="max-h-96 overflow-auto border-2 border-line">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 border-b-2 border-line bg-bg">
                  <tr className="font-black uppercase tracking-wide">
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Game</th>
                    <th className="px-3 py-2">Nama Item</th>
                    <th className="px-3 py-2 text-right">Harga Itemku</th>
                    <th className="px-3 py-2 text-right">Harga Jual (-12%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/30">
                  {visiblePreview.map((p) => (
                    <tr key={p.row.rowNumber} className={p.status === "sama" ? "text-ink-3" : ""}>
                      <td className="px-3 py-2 font-extrabold">
                        <span
                          className={
                            p.status === "ubah" ? "text-brand-strong" : p.status === "baru" ? "text-ok" : "text-ink-3"
                          }
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold">{p.row.nama_game}</td>
                      <td className="px-3 py-2 font-semibold">{p.row.nama_item}</td>
                      <td className="px-3 py-2 text-right">
                        {p.existing && p.status === "ubah" && (
                          <span className="mr-1 text-ink-3 line-through">{formatRupiah(p.existing.harga_asli)}</span>
                        )}
                        {formatRupiah(p.harga_asli_baru)}
                      </td>
                      <td className="px-3 py-2 text-right font-black">
                        {p.existing && p.status === "ubah" && (
                          <span className="mr-1 font-semibold text-ink-3 line-through">{formatRupiah(p.existing.harga_jual)}</span>
                        )}
                        <span className={p.status === "sama" ? "" : "text-brand-strong"}>{formatRupiah(p.harga_jual_baru)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visiblePreview.length === 0 && (
                <div className="py-6 text-center text-sm font-bold text-ink-3">Tidak ada perubahan harga di file ini</div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetUpload}
                className="inline-flex h-10 items-center gap-2 border-2 border-line bg-bg px-4 text-[12px] font-extrabold uppercase tracking-wide text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <X size={14} weight="bold" /> Batal
              </button>
              <button
                type="button"
                onClick={applyUpload}
                disabled={applying || totalToApply === 0}
                className="inline-flex h-10 items-center gap-2 border-2 border-line bg-brand px-4 text-[12px] font-extrabold uppercase tracking-wide text-bg shadow-[3px_3px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
              >
                <Check size={14} weight="bold" />
                {applying ? "Menyimpan..." : `Terapkan ${totalToApply} perubahan`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Edit manual ---------- */}
      <div className="flex flex-col gap-3 border-2 border-line bg-surface p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight">Ubah Harga Manual</h2>
          <p className="text-[12px] font-bold text-ink-3">Isi harga itemku, harga jual -12% dihitung otomatis.</p>
        </div>
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
              <th className="px-4 py-3 text-right">Harga Itemku</th>
              <th className="px-4 py-3 text-right">Harga Jual (-12%, otomatis)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/30">
            {filtered.map((b) => {
              const isEditing = editing[b.id] !== undefined;
              const previewJual = isEditing ? Math.round(parseHarga(editing[b.id]) * 0.88) : b.harga_jual;
              return (
              <tr key={b.id} className="hover:bg-surface-2">
                <td className="px-4 py-3 font-bold">{b.nama_game}</td>
                <td className="px-4 py-3 font-semibold">{b.nama_item}</td>
                <td className="px-4 py-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min={1}
                      value={editing[b.id]}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [b.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") save(b);
                        if (e.key === "Escape") cancelEdit(b.id);
                      }}
                      className="w-32 border-2 border-line bg-bg px-2 py-1 text-right font-bold"
                      aria-label="Harga itemku"
                      autoFocus
                    />
                  ) : (
                    <span className="font-bold">{formatRupiah(b.harga_asli)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-black ${isEditing ? "text-ok" : "text-brand-strong"}`}>{formatRupiah(previewJual)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isEditing ? (
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => cancelEdit(b.id)}
                        className="grid h-8 w-8 place-items-center border-2 border-line bg-surface-2 text-ink transition-all hover:bg-ink hover:text-bg"
                        title="Batal"
                      >
                        <X size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => save(b)}
                        disabled={saving[b.id]}
                        className="grid h-8 w-8 place-items-center border-2 border-line bg-ok text-bg transition-all hover:bg-ink disabled:opacity-60"
                        title="Simpan"
                      >
                        <Check size={14} weight="bold" />
                      </button>
                    </div>
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
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-10 text-center text-sm font-bold text-ink-3">Tidak ada barang</div>}
      </div>
    </div>
  );
}
