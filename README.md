# Matani App – Panduan Implementasi Juri

Selamat datang di panduan resmi untuk menilai proyek **Matani App**. Dokumen ini menuntun juri menyiapkan backend, layanan Supabase, dan aplikasi mobile Expo hingga bisa diuji langsung di perangkat masing-masing.

# 2 opsi untuk menjalankan aplikasi:
### A.) Melalui public QR & Link
### B.) Setup manual in local computer
---
# A.) Melalui public QR & Link
- Scan QR (IOS)
<img width="385" height="294" alt="image" src="https://github.com/user-attachments/assets/f1e91162-cfd0-4ace-bccd-3d4e91e2a69e" />

**ATAU LINK DIBAWAH**

https://expo.dev/preview/update?message=ios+production%3A+moment+of+truth%2C+will+matani+win%3F%21%3F%21+yapastilah+egiluy+kali+%28habis+update+domain+backend%29&updateRuntimeVersion=1.0.0&createdAt=2025-10-12T10%3A46%3A08.007Z&slug=exp&projectId=8412a993-1dcd-42cd-a433-ece093519147&group=58e2b7ad-022f-4cfe-a7f8-cffcbcb9b2d8

- Scan QR (ANDROID)
<img width="386" height="294" alt="image" src="https://github.com/user-attachments/assets/20c5477e-185b-4797-a8cc-18009b571ed6" />

**ATAU LINK DIBAWAH**

https://expo.dev/preview/update?message=android+production%3A+moment+of+truth%2C+will+matani+win%3F%21%3F%21+yapastilah+egiluy+kali+%28habis+update+domain+backend%29&updateRuntimeVersion=1.0.0&createdAt=2025-10-12T10%3A46%3A34.180Z&slug=exp&projectId=8412a993-1dcd-42cd-a433-ece093519147&group=83c83d43-1e90-4fe1-bda1-3c0d02d71813

# B.) Setup manual in local computer
## 1. Ringkasan Proyek
- **Tujuan**: membantu petani memantau lahan, NDVI, cuaca mikro, dan mencatat temuan lapangan.
- **Komponen utama**:
  - Frontend Expo/React Native (`/app`)
  - Backend Express (`/backend`) yang menjembatani NDVI Sentinel Hub, AccuWeather/Open-Meteo, dan Gemini AI
  - Supabase sebagai autentikasi, penyimpanan lahan, catatan, dan bucket thumbnail

## 2. Prasyarat Perangkat & Akun
- Pastikan perangkat mobile dan laptop berada pada **jaringan Wi-Fi yang sama**.
- Laptop/desktop dengan **Node.js 18 LTS** atau lebih baru (`node -v` untuk verifikasi)
- **npm** v9+ (otomatis terpasang bersama Node)
- Aplikasi **Expo Go** pada perangkat Android/iOS juri
- **dianjurkan untuk menggunakan Android/Ios dikarenakan base matani adalah aplikasi :D**.

## 3. Kloning & Instalasi Dependensi (terminal tab ke-1)

# 1) Kloning repository
```powershell
1. a) cd D:\
1. b) git clone https://github.com/ezzeddinp/matani-app.git
1. c) cd matani-app
1. d) npm install
```

# 2) Run frontend Expo (terminal tab ke-2)
```powershell
2. a) npx expo start
2. b) scan QR Code menggunakan kamera bawaan device

- file .env untuk FE -> matani-app/.env:
EXPO_PUBLIC_SUPABASE_URL=https://eyhdrqablhkqmwzfevpk.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_D48epnwIsMB1Iib_ALOF6w_ZAlrx0vt

EXPO_PUBLIC_API_URL=https://matani-backend-ne4yn7s1s-ezzeddinps-projects.vercel.app
```

# 3) Instal dependensi backend Express (terminal tab ke-3)
3. a) cd backend
3. b) npm install
3. c) node index.js
```powershell
- buat folder & file untuk BE -> matani-app/backend/.env:
# Sentinel Hub API credentials
SENTINEL_CLIENT_ID=2bbb5581-b56b-46a2-a22a-ac2395dcbcb8
SENTINEL_CLIENT_SECRET=whoga2y0eA05JzWvbTrTKO8RM4Qw8l6z

EXPO_PUBLIC_SUPABASE_URL=https://eyhdrqablhkqmwzfevpk.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_D48epnwIsMB1Iib_ALOF6w_ZAlrx0vt

ACCUWEATHER_API_KEY=zpka_0774f1efed3f4d92a46ed25614c8c91c_01aeb462

GOOGLE_MAP_FOR_IOS=AIzaSyCeAgDrSVC1DvGLjCuLRr-jQRKRC4C-K2U
GOOGLE_MAP_FOR_ANDROID=AIzaSyCyMgxP5S1epzdME7UIhWE9j-dvY7Cw7j0

GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyApK11Y-CQAdm61zt534nj77n4kaCh-avc

MATANI_GEMINI_MODEL="gemini-2.5-flash-lite"
```
- Console akan menampilkan endpoint aktif (`/weather`, `/ndvi`, `/ai`).
- Biarkan terminal ini tetap terbuka selama demo aplikasi.

```
# Tips terminal (CMD/ Powershell)
- CTRL + C untuk memberhentikan aplikasi.
- Ketik "C" untuk menampilkan ulang QR Code
- Ketik "R" untuk restart aplikasi
```
Selamat Mencoba
