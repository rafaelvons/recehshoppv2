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
    harga_asli: number; // harga itemku; harga jual = -12%
    stok?: number;
    nama_tipe?: string;
  }): Promise<Barang> {
    const harga_asli = body.harga_asli;
    const harga_jual = Math.round(harga_asli * 0.88);
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

  /** Ubah harga itemku (harga_asli); harga jual dihitung otomatis -12% */
  async updateHargaItemku(id: number, harga_asli: number): Promise<{ harga_asli: number; harga_jual: number }> {
    const harga_jual = Math.round(harga_asli * 0.88);
    const { error } = await supabase
      .from("barang")
      .update({ harga_asli, harga_jual, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { harga_asli, harga_jual };
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

  /**
   * Terapkan hasil upload Excel itemku.
   * - updates: barang yang sudah ada, harga_asli = kolom "Harga" Excel, harga_jual = harga_asli × 0.88
   * - inserts: barang baru yang belum ada di database
   */
  async applyHargaExcel(
    updates: { id: number; harga_asli: number; harga_jual: number }[],
    inserts: Omit<Barang, "id">[]
  ): Promise<{ updated: number; inserted: number; failed: string[] }> {
    const now = new Date().toISOString();
    const failed: string[] = [];
    let updated = 0;

    // Update per batch biar tidak membanjiri Supabase
    const BATCH = 10;
    for (let i = 0; i < updates.length; i += BATCH) {
      const chunk = updates.slice(i, i + BATCH);
      const results = await Promise.all(
        chunk.map((u) =>
          supabase
            .from("barang")
            .update({ harga_asli: u.harga_asli, harga_jual: u.harga_jual, updated_at: now })
            .eq("id", u.id)
        )
      );
      results.forEach((r, j) => {
        if (r.error) failed.push(`ID ${chunk[j].id}: ${r.error.message}`);
        else updated++;
      });
    }

    let inserted = 0;
    if (inserts.length) {
      const { error } = await supabase
        .from("barang")
        .insert(inserts.map((b) => ({ ...b, updated_at: now })));
      if (error) failed.push(`Tambah barang baru gagal: ${error.message}`);
      else inserted = inserts.length;
    }

    return { updated, inserted, failed };
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

    // If 1 worker selected, assign user_id to that specific worker
    const targetUserId = workerCount === 1 ? workerIds[0] : body.user_id;

    let splitTag = "";
    if (workerCount > 1) {
      // Fetch usernames for workerIds maintaining selection order
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", workerIds);
      
      const profileMap = new Map((profs ?? []).map((p) => [p.id, p.username]));
      const usernames = workerIds.map((id) => profileMap.get(id)).filter(Boolean) as string[];
      splitTag = ` [Split ${workerCount} Pegawai: ${usernames.join(", ")}]`;
    }

    const record = {
      user_id: targetUserId,
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

  /**
   * Simpan beberapa barang sekaligus untuk pembeli & tim pekerja yang sama.
   * Satu baris log per barang, nama pembeli & info split cukup diisi sekali.
   */
  async createLogs(body: {
    user_id: string;
    deskripsi: string;
    items: { barang_id: number; qty: number }[];
    worker_user_ids?: string[];
  }): Promise<{ count: number; jumlahBarang: number; grandTotal: number; totalPerPerson: number }> {
    if (!body.items.length) throw new Error("Belum ada barang yang dipilih");

    const ids = Array.from(new Set(body.items.map((i) => i.barang_id)));
    const { data: barangRows, error: barangErr } = await supabase
      .from("barang")
      .select("id, harga_jual")
      .in("id", ids);
    if (barangErr) throw new Error(barangErr.message);
    const hargaMap = new Map((barangRows ?? []).map((b) => [b.id as number, b.harga_jual as number]));

    const workerIds = body.worker_user_ids?.length ? body.worker_user_ids : [body.user_id];
    const workerCount = workerIds.length;
    const targetUserId = workerCount === 1 ? workerIds[0] : body.user_id;

    let splitTag = "";
    if (workerCount > 1) {
      const { data: profs } = await supabase.from("profiles").select("id, username").in("id", workerIds);
      const profileMap = new Map((profs ?? []).map((p) => [p.id, p.username]));
      const usernames = workerIds.map((id) => profileMap.get(id)).filter(Boolean) as string[];
      splitTag = ` [Split ${workerCount} Pegawai: ${usernames.join(", ")}]`;
    }

    const records = body.items.map((it) => {
      const harga = hargaMap.get(it.barang_id);
      if (harga == null) throw new Error(`Barang ID ${it.barang_id} tidak ditemukan`);
      return {
        user_id: targetUserId,
        barang_id: it.barang_id,
        deskripsi: `${body.deskripsi}${splitTag}`,
        qty: it.qty,
        harga_satuan: harga,
        total: it.qty * harga,
      };
    });

    const { error } = await supabase.from("log_kerja").insert(records);
    if (error) throw new Error(error.message);

    const grandTotal = records.reduce((s, r) => s + r.total, 0);
    return {
      count: workerCount,
      jumlahBarang: records.length,
      grandTotal,
      totalPerPerson: Math.round(grandTotal / workerCount),
    };
  },

  async getLogs(): Promise<LogKerja[]> {
    const { data, error } = await supabase
      .from("log_kerja")
      .select("*, profiles(username), barang(nama_game, nama_item)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data as any[]).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      user_id: row.user_id,
      barang_id: row.barang_id,
      deskripsi: row.deskripsi,
      qty: row.qty,
      harga_satuan: row.harga_satuan,
      total: row.total,
      username: row.profiles?.username ?? "Unknown",
      nama_game: row.barang?.nama_game ?? "Unknown",
      nama_item: row.barang?.nama_item ?? "Unknown",
    }));
  },

  async deleteLog(id: number): Promise<{ ok: boolean }> {
    const { error } = await supabase.from("log_kerja").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async clearLogs(targetUserId?: string): Promise<{ ok: boolean }> {
    let uid = targetUserId;
    if (!uid || uid === "me") {
      const { data: { session } } = await supabase.auth.getSession();
      uid = session?.user?.id;
    }

    if (!uid) throw new Error("User ID tidak ditemukan");

    if (uid === "all") {
      // Try calling RPC procedure first (bypasses RLS if created), fallback to delete query
      const { error: rpcErr } = await supabase.rpc("clear_all_logs");
      if (rpcErr) {
        const { data: allLogs } = await supabase.from("log_kerja").select("id");
        if (allLogs && allLogs.length > 0) {
          const ids = allLogs.map((l) => l.id);
          const { error } = await supabase.from("log_kerja").delete().in("id", ids);
          if (error) throw new Error(error.message);
        }
      }
    } else {
      // Fetch target user's profile to get username
      const { data: prof } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", uid)
        .maybeSingle();

      const username = prof?.username;

      // Delete logs created by target user
      const { error: err1 } = await supabase.from("log_kerja").delete().eq("user_id", uid);
      if (err1) throw new Error(err1.message);

      // If username exists, also delete split logs mentioning this user
      if (username) {
        const { error: err2 } = await supabase
          .from("log_kerja")
          .delete()
          .ilike("deskripsi", `%${username}%`);
        if (err2) console.error("Error clearing split logs:", err2.message);
      }
    }

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
    const match = l.deskripsi.match(/\[Split\s+(\d+)\s+Pegawai(?:\s*:\s*([^\]]+))?\]/i);
    if (match) {
      const countFromTag = Number(match[1]) || 1;
      const namesStr = match[2];
      const names = namesStr ? namesStr.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const actualCount = Math.max(countFromTag, names.length);
      const share = Math.round(l.total / actualCount);

      if (names.length > 0) {
        for (const name of names) {
          const cur = map.get(name) ?? { total: 0, jobs: 0 };
          cur.total += share;
          cur.jobs += 1;
          map.set(name, cur);
        }
        continue;
      } else {
        const workerName = l.username || "Unknown";
        const cur = map.get(workerName) ?? { total: 0, jobs: 0 };
        cur.total += share;
        cur.jobs += 1;
        map.set(workerName, cur);
        continue;
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
