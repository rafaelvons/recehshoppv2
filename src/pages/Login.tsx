import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user =
        mode === "login"
          ? await api.login(username, password)
          : await api.register(username, password);
      login(user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-5">
      <div className="w-full max-w-sm border-4 border-line bg-surface p-6 shadow-[10px_10px_0px_0px_var(--color-line)]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center border-4 border-line bg-brand text-2xl font-black text-bg shadow-[4px_4px_0px_0px_var(--color-line)]">
            R
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">RecehShopp</h1>
          <p className="text-[12px] font-extrabold uppercase tracking-widest text-ink-3">
            {mode === "login" ? "Masuk pegawai" : "Daftar pegawai"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-2 border-line bg-bg px-3 py-2.5 text-sm font-semibold text-ink placeholder:text-ink-3"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-line bg-bg px-3 py-2.5 text-sm font-semibold text-ink placeholder:text-ink-3"
              placeholder="••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="border-2 border-line-strong bg-bad/10 px-3 py-2 text-[12px] font-bold text-bad">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-line bg-brand py-3 text-sm font-extrabold uppercase tracking-wide text-bg shadow-[4px_4px_0px_0px_var(--color-line)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
          >
            {loading ? "Memuat..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-4 w-full text-center text-[12px] font-bold text-ink-2 hover:text-ink"
        >
          {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </div>
  );
}
