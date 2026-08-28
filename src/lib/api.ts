import { supabase } from "./supabase";

// ---------- Types ----------

export interface User {
  id: string; // UUID from Supabase Auth
  username: string;
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

/** We store usernames as fake emails so Supabase Auth works with username/password. */
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
  async login(username: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });
    if (error) throw new Error(error.message);
    return {
      id: data.user.id,
      username: data.user.user_metadata.username ?? username,
    };
  },

  async register(username: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email: toEmail(username),
      password,
      options: { data: { username } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Registrasi gagal");
    return {
      id: data.user.id,
      username,
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

    const splitTag =
      workerCount > 1 ? ` [Split ${workerCount} Pegawai]` : "";
    const finalDesc = `${body.deskripsi}${splitTag}`;

    const records = workerIds.map((uid) => ({
      user_id: uid,
      barang_id: body.barang_id,
      deskripsi: finalDesc,
      qty: body.qty,
      harga_satuan: barang.harga_jual,
      total: totalPerPerson,
    }));

    const { error } = await supabase.from("log_kerja").insert(records);
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
