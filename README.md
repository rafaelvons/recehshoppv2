# RecehShopp - Dashboard Penjualan

Dashboard penjualan toko: pantau pendapatan, pesanan, status, dan produk terlaris. Data bisa ditarik otomatis dari itemku lewat Tokoku API. Sekarang ada sistem login pegawai, daftar barang dari Excel, log kerja, dan ubah harga dengan pajak 12%.

## Stack

- **React 19 + TypeScript** (Vite 8)
- **Tailwind CSS v4**
- **Recharts** (grafik pendapatan)
- **Phosphor Icons**
- **Express + better-sqlite3** backend
- Data pesanan tetap di `localStorage`; data user, barang, dan log kerja di SQLite

## Menjalankan

```bash
npm install
npm run seed       # import Excel ke SQLite (sekali saja)
npm run dev        # jalanin backend + frontend bareng
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001

### Mode produksi (buka dari mana saja)

```bash
npm run build        # build frontend ke dist/
npm run server       # satu server di port 3001 (backend + frontend)
```

Buka di browser PC / HP mana saja:

```
http://43.228.213.157:3001
```

### Auto-start kalau VPS reboot

```bash
crontab -e
```

Tambahkan baris:

```
@reboot /home/deploy/itemku-dashboard/start.sh
```

### Jalankan sekarang tanpa logout

```bash
cd /home/deploy/itemku-dashboard
npm run server
```

Kalo mau jalan di background:

```bash
./start.sh
```

## Akun default

- username: `admin`
- password: `admin123`

Bisa juga daftar akun baru lewat halaman login.

## Fitur baru

- **Login / Register** pegawai
- **Daftar Barang**: dari Excel, otomatis dipotong pajak 12% (`harga_jual = harga_asli * 0.88`)
- **Log Kerja**: pegawai input "carry raid x3" → total = qty × harga_jual setelah pajak
- **Ubah Harga**: edit harga jual per barang, harga asli otomatis recalc

## Struktur

```
server/
  schema.sql           # tabel users, barang, log_kerja
  db.ts                # koneksi SQLite
  seed.ts              # import Excel + user default
  index.ts             # Express API
src/
  lib/api.ts           # helper fetch ke backend
  lib/auth.tsx         # context login
  pages/
    Login.tsx
    Barang.tsx
    Kerja.tsx
    UbahHarga.tsx
  components/
    AppShell.tsx       # layout + navigasi
    ProtectedRoute.tsx # guard halaman login
```
