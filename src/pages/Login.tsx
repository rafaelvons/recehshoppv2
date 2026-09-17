import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Envelope,
  Lock,
  Eye,
  EyeSlash,
  WarningCircle,
  CheckCircle,
  SignIn,
  UserPlus,
  ShieldCheck,
} from "@phosphor-icons/react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleModeChange = (newMode: "login" | "register") => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (!username.trim()) {
          throw new Error("Username wajib diisi");
        }
        if (!email.trim() || !email.includes("@")) {
          throw new Error("Email wajib diisi dengan format email yang benar");
        }
        if (password.length < 6) {
          throw new Error("Password minimal 6 karakter");
        }
        if (password !== confirmPassword) {
          throw new Error("Konfirmasi password tidak cocok");
        }

        const user = await api.register(username, email, password);
        setSuccess("Akun berhasil terdaftar! Mengalihkan ke dashboard...");
        setTimeout(() => {
          login(user);
          navigate("/");
        }, 1000);
      } else {
        if (!username.trim()) {
          throw new Error("Username atau Email wajib diisi");
        }
        if (!password) {
          throw new Error("Password wajib diisi");
        }

        const user = await api.login(username, password);
        login(user);
        navigate("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4 sm:p-6">
      {/* Background decoration elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-30">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full border-4 border-line bg-brand/20 blur-2xl"></div>
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full border-4 border-line bg-brand/15 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md border-4 border-line bg-surface p-6 shadow-[12px_12px_0px_0px_var(--color-line)] transition-all sm:p-8">
        {/* Header Branding */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-4 border-line bg-brand text-3xl font-black text-bg shadow-[5px_5px_0px_0px_var(--color-line)] transition-transform hover:scale-105">
            R
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight">RecehShopp</h1>
          <p className="mt-1 text-[12px] font-extrabold uppercase tracking-widest text-ink-3">
            Sistem Kelola & Log Kerja Pegawai
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 grid grid-cols-2 border-2 border-line bg-bg p-1 shadow-[3px_3px_0px_0px_var(--color-line)]">
          <button
            type="button"
            onClick={() => handleModeChange("login")}
            className={`flex items-center justify-center gap-2 py-2.5 text-[12px] font-black uppercase tracking-wider transition-all ${
              mode === "login"
                ? "border-2 border-line bg-brand text-bg shadow-[2px_2px_0px_0px_var(--color-line)]"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            <SignIn size={16} weight="bold" />
            Masuk
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("register")}
            className={`flex items-center justify-center gap-2 py-2.5 text-[12px] font-black uppercase tracking-wider transition-all ${
              mode === "register"
                ? "border-2 border-line bg-brand text-bg shadow-[2px_2px_0px_0px_var(--color-line)]"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            <UserPlus size={16} weight="bold" />
            Daftar Akun
          </button>
        </div>

        {/* Info Banner for Register mode */}
        {mode === "register" && (
          <div className="mb-5 flex items-start gap-2.5 border-2 border-line bg-brand/10 p-3 text-[11px] font-bold text-ink">
            <ShieldCheck size={20} weight="fill" className="shrink-0 text-brand" />
            <span>
              Pendaftaran memerlukan <strong>Email resmi</strong> dan <strong>Username</strong> aktif agar akun Anda terdata secara valid.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-ink">
              <span>{mode === "login" ? "Username atau Email" : "Username Pegawai"}</span>
              <span className="text-[10px] text-ink-3">Wajib</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-3">
                <UserIcon size={18} weight="bold" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border-2 border-line bg-bg pl-10 pr-3 py-2.5 text-sm font-semibold text-ink placeholder:text-ink-3 focus:bg-surface"
                placeholder={mode === "login" ? "Contoh: budi_gaming / budi@gmail.com" : "Contoh: budi_gaming"}
                required
                autoComplete="username"
              />
            </div>
          </div>

          {/* Email Input (Shown during Register) */}
          {mode === "register" && (
            <div>
              <label className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-ink">
                <span>Email Terdaftar</span>
                <span className="text-[10px] text-ink-3 font-extrabold">Eksplisit</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-3">
                  <Envelope size={18} weight="bold" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-line bg-bg pl-10 pr-3 py-2.5 text-sm font-semibold text-ink placeholder:text-ink-3 focus:bg-surface"
                  placeholder="Contoh: pegawai@gmail.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          {/* Password Input */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-ink">
              <span>Password</span>
              <span className="text-[10px] text-ink-3">Min. 6 Karakter</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-3">
                <Lock size={18} weight="bold" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-line bg-bg pl-10 pr-10 py-2.5 text-sm font-semibold text-ink placeholder:text-ink-3 focus:bg-surface"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-3 hover:text-ink"
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Shown during Register) */}
          {mode === "register" && (
            <div>
              <label className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-ink">
                <span>Konfirmasi Password</span>
                <span className="text-[10px] text-ink-3">Harus Sama</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-3">
                  <Lock size={18} weight="bold" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border-2 border-line bg-bg pl-10 pr-3 py-2.5 text-sm font-semibold text-ink placeholder:text-ink-3 focus:bg-surface"
                  placeholder="Ulangi password di atas"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 border-2 border-line-strong bg-bad/15 p-3 text-[12px] font-bold text-bad">
              <WarningCircle size={18} weight="fill" className="shrink-0 mt-0.5 text-bad" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-start gap-2 border-2 border-line-strong bg-ok/15 p-3 text-[12px] font-bold text-ok">
              <CheckCircle size={18} weight="fill" className="shrink-0 mt-0.5 text-ok" />
              <span>{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-line bg-brand py-3.5 text-sm font-black uppercase tracking-wider text-bg shadow-[5px_5px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
          >
            {loading ? (
              <span className="animate-pulse">Memuat...</span>
            ) : mode === "login" ? (
              <>
                <SignIn size={18} weight="bold" />
                Masuk ke Dashboard
              </>
            ) : (
              <>
                <UserPlus size={18} weight="bold" />
                Daftar Pegawai Sekarang
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle text */}
        <div className="mt-6 text-center border-t-2 border-line/20 pt-4">
          <button
            type="button"
            onClick={() => handleModeChange(mode === "login" ? "register" : "login")}
            className="text-[12px] font-extrabold text-ink-2 hover:text-brand hover:underline"
          >
            {mode === "login"
              ? "Belum punya akun pegawai? Daftar di sini"
              : "Sudah punya akun? Masuk ke aplikasi"}
          </button>
        </div>
      </div>
    </div>
  );
}
