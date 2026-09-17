import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { CheckCircle } from "@phosphor-icons/react";
import type { Order, OrderStatus, RangeKey } from "./types";
import { useOrders, clearOrders, savePeriod } from "./lib/storage";
import { downloadCSV } from "./lib/csv";
import Toolbar from "./components/Toolbar";
import KpiCards, { computeKpis } from "./components/KpiCards";
import RevenueChart from "./components/RevenueChart";
import StatusPanel from "./components/StatusPanel";
import OrderTable from "./components/OrderTable";
import WorkerSummary from "./components/WorkerSummary";
import ClosePeriodModal from "./components/ClosePeriodModal";
import { ImportModal, SyncModal } from "./components/Modals";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import BarangPage from "./pages/Barang";
import KerjaPage from "./pages/Kerja";
import UbahHargaPage from "./pages/UbahHarga";

import { api, type LogKerja } from "./lib/api";

function logToOrder(l: LogKerja): Order {
  return {
    id: `log-${l.id}`,
    no: `LOG-${l.id}`,
    product: l.nama_item || "Jasa / Carry",
    game: l.nama_game || "General",
    price: l.harga_satuan,
    qty: l.qty,
    income: l.total,
    status: "DELIVERED",
    date: l.created_at,
  };
}

function inRange(o: Order, days: number | "all"): boolean {
  if (days === "all") return true;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (Number(days) - 1));
  return new Date(o.date) >= cutoff;
}

function Dashboard() {
  const { orders, setOrders, addOrders, removeOrder } = useOrders();
  const [dbLogs, setDbLogs] = useState<LogKerja[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [range, setRange] = useState<RangeKey>("30");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [showImport, setShowImport] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showClosePeriod, setShowClosePeriod] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    api.getLogs().then(setDbLogs).catch(console.error);
    api.getProfiles().then(setProfiles).catch(console.error);
  }, []);

  const combinedOrders = useMemo(() => {
    const logOrders = dbLogs.map(logToOrder);
    return [...logOrders, ...orders];
  }, [dbLogs, orders]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const filtered = useMemo(() => {
    let list = combinedOrders.filter((o) => inRange(o, range === "all" ? "all" : Number(range)));
    if (status !== "all") list = list.filter((o) => o.status === status);
    return list;
  }, [combinedOrders, range, status]);

  const kpis = useMemo(
    () => computeKpis(combinedOrders, range === "all" ? "all" : Number(range)),
    [combinedOrders, range]
  );

  const chartDays = range === "all" ? 30 : Number(range);

  const handleImport = useCallback(
    (incoming: Order[]) => {
      addOrders(incoming);
      showToast(incoming.length + " pesanan diimport");
    },
    [addOrders, showToast]
  );

  const handleSync = useCallback(
    (incoming: Order[], rawCount: number) => {
      const existing = new Set(orders.map((o) => o.no));
      const fresh = incoming.filter((o) => !existing.has(o.no));
      if (fresh.length) addOrders(fresh);
      const dup = rawCount - fresh.length;
      showToast(
        fresh.length
          ? fresh.length + " pesanan ditarik" + (dup ? " (" + dup + " sudah ada)" : "")
          : "Tidak ada pesanan baru"
      );
    },
    [orders, addOrders, showToast]
  );

  const handleExport = useCallback(() => {
    downloadCSV(combinedOrders);
    showToast("CSV diexport");
  }, [combinedOrders, showToast]);

  const handleDelete = useCallback(
    (id: string) => {
      if (id.startsWith("log-")) {
        const numId = Number(id.replace("log-", ""));
        api.deleteLog(numId).then(() => {
          api.getLogs().then(setDbLogs);
          showToast("Log dihapus");
        });
      } else {
        removeOrder(id);
        showToast("Pesanan dihapus");
      }
    },
    [removeOrder, showToast]
  );

  const handleClosePeriod = useCallback(
    async (targetUserId?: string) => {
      const revenue = combinedOrders.reduce((s, o) => s + o.income, 0);
      const delivered = combinedOrders.filter((o) => o.status === "DELIVERED").length;
      const processing = combinedOrders.filter((o) => o.status === "REQUIRE_PROCESS").length;
      const refunded = combinedOrders.filter((o) => o.status === "REFUNDED").length;
      const workerPayout = dbLogs.reduce((s, l) => s + l.total, 0);

      savePeriod({
        id: Date.now().toString(36),
        closedAt: new Date().toISOString(),
        totalRevenue: revenue,
        totalOrders: combinedOrders.length,
        delivered,
        refunded,
        processing,
        workerPayout,
      });

      try {
        await api.clearLogs(targetUserId);
      } catch (err) {
        console.error("Gagal mereset log:", err);
      }

      if (targetUserId === "all") {
        clearOrders();
        setOrders([]);
      }

      const freshLogs = await api.getLogs().catch(() => []);
      setDbLogs(freshLogs);
      setShowClosePeriod(false);
      showToast(
        targetUserId === "all"
          ? "Periode ditutup global. Semua data dimulai dari 0."
          : "Periode pegawai berhasil ditutup. Log kerja berhasil di-reset."
      );
    },
    [combinedOrders, dbLogs, setOrders, showToast]
  );

  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-[1200px] px-5 pb-14">
        <Toolbar
          range={range}
          onRange={setRange}
          status={status}
          onStatus={setStatus}
          onSync={() => setShowSync(true)}
          onImport={() => setShowImport(true)}
          onExport={handleExport}
          onClosePeriod={() => setShowClosePeriod(true)}
        />

        <div className="mt-4">
          <KpiCards data={kpis} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart orders={filtered} days={chartDays} />
          </div>
          <StatusPanel orders={filtered} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <WorkerSummary days={range === "all" ? "all" : Number(range)} />
          <div className="lg:col-span-2">
            <OrderTable orders={filtered} onDelete={handleDelete} />
          </div>
        </div>

        <footer className="mt-10 text-center text-[11px] text-ink-3">
          Data tersimpan lokal di browser (localStorage). Dashboard penjualan RecehShopp.
        </footer>
      </main>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      {showSync && <SyncModal onClose={() => setShowSync(false)} onSync={handleSync} />}
      {showClosePeriod && (
        <ClosePeriodModal
          orders={combinedOrders}
          logs={dbLogs}
          profiles={profiles}
          onClose={() => setShowClosePeriod(false)}
          onConfirm={handleClosePeriod}
        />
      )}

      <div
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line-strong bg-surface-2 px-5 py-2.5 text-[13px] font-semibold shadow-2xl transition-all duration-300 ${
          toastMsg ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        <CheckCircle size={15} weight="fill" className="text-ok" />
        {toastMsg}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/barang" element={<BarangPage />} />
          <Route path="/kerja" element={<KerjaPage />} />
          <Route path="/ubah-harga" element={<UbahHargaPage />} />
        </Route>
      </Route>
      <Route path="*" element={<div className="p-10 text-center font-black">Halaman tidak ditemukan</div>} />
    </Routes>
  );
}
