import { supabase } from "./supabase";

// ---------- Types ----------

export interface User {
  id: string; // UUID from Supabase Auth
  username: string;
  email?: string;
  isAdmin?: boolean;
}

export function checkIsAdmin(username?: string): boolean {
  if (!username) return false;
  const clean = username.toLowerCase().trim();
  return clean === "pawlgaot" || clean === "admin";
}

export interface Barang {
  id: number;
  id_item: number | null;
  nama_game: string;
  nama_tipe: string;
  server_name: string | null;
  grup_name: string | null;
  nama_item: string;
  stok: number;
  metode_pengiriman: number;
  min_pesanan: number;
  harga_asli: number;
  harga_jual: number;
}

export interface LogKerja {
  id: number;
  deskripsi: string;
  qty: number;
  harga_satuan: number;
  total: number;
  created_at: string;
  username: string;
  nama_item: string;
  nama_game: string;
}

// ---------- Helpers ----------

/** Fallback email builder for legacy accounts without explicit email */
function toEmail(username: string): string {
  const clean = username.toLowerCase().trim().replace(/[^a-z0-9._-]/g, "");
  return `${clean || "user"}@gmail.com`;
}

function throwOnError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

// ---------- API ----------

export const api = {
  // Auth
  async login(identifier: string, password: string): Promise<User> {
    const cleanInput = identifier.trim();
    if (!cleanInput) throw new Error("Username atau email wajib diisi");
    
    let targetEmail = cleanInput;
    if (!cleanInput.includes("@")) {
      targetEmail = toEmail(cleanInput);
    }

    let { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (error && !cleanInput.includes("@")) {
      // If logging in with username failed on fallback email, return user friendly error
      throw new Error("Username/Email atau Password salah");
    }

    if (error) {
      throw new Error(error.message === "Invalid login credentials" ? "Email atau Password salah" : error.message);
    }

    if (!data.user) throw new Error("Login gagal");

    const username =
      (data.user.user_metadata?.username as string) ??
      cleanInput.split("@")[0];

    return {
      id: data.user.id,
      username,
      email: data.user.email,
      isAdmin: checkIsAdmin(username),
    };
  },

  async register(username: string, email: string, password: string): Promise<User> {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) throw new Error("Username tidak boleh kosong");
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Email tidak valid");
    if (password.length < 6) throw new Error("Password minimal 6 karakter");

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { username: cleanUsername },
      },
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Registrasi gagal. Silakan coba lagi.");

    // Sync profile username
    try {
      await supabase.from("profiles").upsert(
        { id: data.user.id, username: cleanUsername },
        { onConflict: "id" }
      );
    } catch {
      // Profile auto-trigger will also execute
    }

    return {
      id: data.user.id,
      username: cleanUsername,
      email: cleanEmail,
      isAdmin: checkIsAdmin(cleanUsername),
    };
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  // Barang
  async getBarang(): Promise<Barang[]> {
    const { data, error } = await supabase
      .from("barang")
      .select(
        "id, id_item, nama_game, nama_tipe, server_name, grup_name, nama_item, stok, metode_pengiriman, min_pesanan, harga_asli, harga_jual"
      )
      .order("nama_game")
      .order("nama_item");
    if (error) throw new Error(error.message);
    return data as Barang[];
  },

  async createBarang(body: {
    nama_game: string;
    nama_item: string;
    harga_jual: number;
    stok?: number;
    nama_tipe?: string;
  }): Promise<Barang> {
    const harga_jual = body.harga_jual;
    const harga_asli = Math.round(harga_jual / 0.88);
    const { data, error } = await supabase
      .from("barang")
      .insert({
        nama_game: body.nama_game.trim(),
        nama_item: body.nama_item.trim(),
        nama_tipe: (body.nama_tipe ?? "").trim(),
        harga_jual,
        harga_asli,
        stok: body.stok ?? 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Barang;
  },

  async updateHarga(id: number, harga_jual: number): Promise<{ ok: true }> {
    const harga_asli = Math.round(harga_jual / 0.88);
    const { error } = await supabase
      .from("barang")
      .update({ harga_jual, harga_asli, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  // Profiles
  async getProfiles(): Promise<User[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .order("username");
    if (error) throw new Error(error.message);
    return data as User[];
  },

  // Log Kerja
  async createLog(body: {
    user_id: string;
    barang_id: number;
    deskripsi: string;
    qty: number;
    worker_user_ids?: string[]; // Multiple workers involved
  }): Promise<{ count: number; totalPerPerson: number }> {
    // Fetch harga_jual first
    const barang = throwOnError(
      await supabase
        .from("barang")
        .select("harga_jual")
        .eq("id", body.barang_id)
        .single()
    ) as { harga_jual: number };

    const workerIds = body.worker_user_ids?.length
      ? body.worker_user_ids
      : [body.user_id];
    const workerCount = workerIds.length;
    const grossTotal = body.qty * barang.harga_jual;
    const totalPerPerson = Math.round(grossTotal / workerCount);

    let splitTag = "";
    if (workerCount > 1) {
      // Fetch usernames for workerIds
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", workerIds);
      
      const usernames = profs?.map((p) => p.username) ?? [];
      splitTag = ` [Split ${workerCount} Pegawai: ${usernames.join(", ")}]`;
    }

    const record = {
      user_id: body.user_id,
      barang_id: body.barang_id,
      deskripsi: `${body.deskripsi}${splitTag}`,
      qty: body.qty,
      harga_satuan: barang.harga_jual,
      total: grossTotal,
    };

    const { error } = await supabase.from("log_kerja").insert(record);
    if (error) throw new Error(error.message);

    return { count: workerCount, totalPerPerson };
  },

  async getLogs(): Promise<LogKerja[]> {
    const { data, error } = await supabase
      .from("log_kerja")
      .select(
        `id, deskripsi, qty, harga_satuan, total, created_at,
         profiles(username),
         barang(nama_item, nama_game)`
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Flatten the nested PostgREST response
    return (data as unknown[]).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      const profile = r.profiles as { username: string } | null;
      const barang = r.barang as { nama_item: string; nama_game: string } | null;
      return {
        id: r.id as number,
        deskripsi: r.deskripsi as string,
        qty: r.qty as number,
        harga_satuan: r.harga_satuan as number,
        total: r.total as number,
        created_at: r.created_at as string,
        username: profile?.username ?? "",
        nama_item: barang?.nama_item ?? "",
        nama_game: barang?.nama_game ?? "",
      };
    });
  },

  async deleteLog(id: number): Promise<{ ok: true }> {
    const { error } = await supabase.from("log_kerja").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async clearLogs(targetUserId?: string): Promise<{ ok: true }> {
    let uid = targetUserId;
    if (!uid || uid === "me") {
      const { data: { session } } = await supabase.auth.getSession();
      uid = session?.user?.id;
    }

    let query = supabase.from("log_kerja").delete();
    if (uid && uid !== "all") {
      query = query.eq("user_id", uid);
    } else {
      query = query.neq("id", 0);
    }
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async getSummary(
    user_id: string
  ): Promise<{ total: number; jumlah: number }> {
    const { data, error } = await supabase
      .from("log_kerja")
      .select("total")
      .eq("user_id", user_id);
    if (error) throw new Error(error.message);
    const rows = data as { total: number }[];
    return {
      total: rows.reduce((sum, r) => sum + r.total, 0),
      jumlah: rows.length,
    };
  },
};

export function parseWorkerPayouts(logs: LogKerja[]): Map<string, { total: number; jobs: number }> {
  const map = new Map<string, { total: number; jobs: number }>();

  for (const l of logs) {
    // Check if deskripsi contains [Split X Pegawai: ...]
    const match = l.deskripsi.match(/\[Split\s+\d+\s+Pegawai(?:\s*:\s*([^\]]+))?\]/i);
    if (match) {
      const namesStr = match[1];
      if (namesStr) {
        const names = namesStr.split(",").map((s) => s.trim()).filter(Boolean);
        if (names.length > 0) {
          const share = Math.round(l.total / names.length);
          for (const name of names) {
            const cur = map.get(name) ?? { total: 0, jobs: 0 };
            cur.total += share;
            cur.jobs += 1;
            map.set(name, cur);
          }
          continue;
        }
      }
    }

    // Fallback: single worker
    const workerName = l.username || "Unknown";
    const cur = map.get(workerName) ?? { total: 0, jobs: 0 };
    cur.total += l.total;
    cur.jobs += 1;
    map.set(workerName, cur);
  }

  return map;
}
