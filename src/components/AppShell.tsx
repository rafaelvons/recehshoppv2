import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Moon, Sun, List, CurrencyDollar, ClipboardText, SignOut } from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/storage";

const nav = [
  { to: "/", label: "Dashboard", icon: List },
  { to: "/barang", label: "Barang", icon: CurrencyDollar },
  { to: "/kerja", label: "Log Kerja", icon: ClipboardText },
  { to: "/ubah-harga", label: "Ubah Harga", icon: CurrencyDollar },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b-4 border-line bg-bg">
        <div className="mx-auto flex h-18 max-w-[1200px] items-center gap-4 px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center border-4 border-line bg-brand text-xl font-black text-bg shadow-[6px_6px_0px_0px_var(--color-line)]">
              R
            </div>
            <div className="leading-none">
              <div className="text-xl font-black uppercase tracking-tight">RecehShopp</div>
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink-3">dashboard penjualan</div>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-2 border-2 px-3 text-[12px] font-extrabold uppercase tracking-wide transition-all ${
                    isActive
                      ? "border-line bg-ink text-bg"
                      : "border-transparent text-ink hover:border-line hover:bg-surface"
                  }`
                }
              >
                <item.icon size={16} weight="bold" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="text-[12px] font-black leading-none">{user?.username ?? "-"}</div>
              <div className="text-[10px] font-bold text-ink-3">{user?.email ? user.email : "pegawai"}</div>
            </div>
            <button
              onClick={toggleTheme}
              title="Ganti tema"
              className="grid h-10 w-10 place-items-center border-2 border-line bg-surface text-ink transition-all hover:bg-ink hover:text-bg active:translate-y-0.5"
            >
              {theme === "dark" ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
            </button>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="grid h-10 w-10 place-items-center border-2 border-line bg-surface text-bad transition-all hover:bg-bad hover:text-bg active:translate-y-0.5"
            >
              <SignOut size={18} weight="bold" />
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b-2 border-line bg-surface md:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center gap-1 overflow-x-auto px-3 py-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 border-2 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide ${
                  isActive ? "border-line bg-ink text-bg" : "border-transparent text-ink"
                }`
              }
            >
              <item.icon size={14} weight="bold" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1200px] px-5 pb-14 pt-6">
        <Outlet />
      </main>
    </div>
  );
}
