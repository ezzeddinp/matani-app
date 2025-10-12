# Matani App – Panduan Implementasi Juri

Selamat datang di panduan resmi untuk menilai proyek **Matani App**. Dokumen ini menuntun juri menyiapkan backend, layanan Supabase, dan aplikasi mobile Expo hingga bisa diuji langsung di perangkat masing-masing.

## 1. Ringkasan Proyek
- **Tujuan**: membantu petani memantau lahan, NDVI, cuaca mikro, dan mencatat temuan lapangan.
- **Komponen utama**:
  - Frontend Expo/React Native (`/app`)
  - Backend Express (`/backend`) yang menjembatani NDVI Sentinel Hub, AccuWeather/Open-Meteo, dan Gemini AI
  - Supabase sebagai autentikasi, penyimpanan lahan, catatan, dan bucket thumbnail

## 2. Prasyarat Perangkat & Akun
- Laptop/desktop dengan **Node.js 18 LTS** atau lebih baru (`node -v` untuk verifikasi)
- **npm** v9+ (otomatis terpasang bersama Node)
- **Expo Go** pada perangkat Android/iOS juri

## 3. Kloning & Instalasi Dependensi (terminal tab ke-1)
```powershell
# 1) Kloning repository
1. a) cd D:\
1. b) git clone https://github.com/ezzeddinp/matani-app.git
1. c) cd matani-app
1. d) npm install

# 2) Run frontend Expo (terminal tab ke-2)
2. a) npx expo start
2. b) copy address localhost ke url browser.

# 3) Instal dependensi backend Express (terminal tab ke-3)
3. a) cd backend
3. b) npm install
3. c) node index.js
- Console akan menampilkan endpoint aktif (`/weather`, `/ndvi`, `/ai`).
- Biarkan terminal ini tetap terbuka selama demo aplikasi.
```

```
- Pastikan perangkat mobile dan laptop berada pada **jaringan Wi-Fi yang sama**.

- Pilih opsi **QR Code** untuk membuka di Expo Go.
```

```
# Tips terminal (CMD/ Powershell)
- CTRL + C untuk memberhentikan aplikasi.
- Ketik "C" untuk menampilkan ulang QR Code
- Ketik "R" untuk restart aplikasi
```

## 4. Alur Uji Singkat yang Disarankan
1. **Dashboard Explore** – pahami filter komoditas, peta polygon, dan status NDVI warna.
2. **Detail Lahan** – buka salah satu lahan untuk melihat riwayat NDVI dan tips tindakan.
3. **Cuaca** – validasi kartu cuaca mengambil data dari backend (`/weather`). Jika API key tidak tersedia, perhatikan label "Open-Meteo fallback".
4. **Catatan** – tambahkan catatan lapangan, lalu pastikan tersimpan di Supabase dan muncul dalam daftar.
5. **AI Summary** – tekan ringkasan lahan. Jika Gemini key aktif, Anda akan menerima 3 poin prioritas dalam bahasa Indonesia.

