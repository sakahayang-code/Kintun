# Kintun - Kirim & Terima Berkas Cepat & Aman

**Kintun** adalah aplikasi web transfer berkas modern yang terinspirasi dari arsitektur Send Anywhere. Kintun memungkinkan pengguna berbagi file secara langsung lintas perangkat tanpa batasan akun, dengan antarmuka bersih dan performa tinggi.

Kintun dirancang fleksibel: dapat langsung berjalan di **cPanel / Apache / Shared Hosting (PHP)** maupun di lingkungan **Node.js (VPS / Cloud)**.

---

## 🚀 Fitur Utama

1. **Kirim Berkas (Send)**:
   - **Multi-File & Folder**: Drag & drop atau pilih banyak file dan folder sekaligus.
   - **Mode 1: Transfer Langsung (Kunci 6-Digit)**:
     - Kunci 6-digit numerik unik dibuat instan (contoh: `482 915`).
     - Hitung mundur 10 menit (*live countdown timer*).
     - Kode QR dinamis untuk dipindai langsung dari kamera smartphone.
     - Deteksi penerima secara real-time.
   - **Mode 2: Tautan Berbagi (Link Sharing)**:
     - Tautan unduhan aktif selama 48 jam yang bisa dibagikan ke banyak orang.
   - **Indikator Progres Real-Time**: Kecepatan transfer (MB/s), persen progres, dan waktu tersisa.

2. **Terima Berkas (Receive)**:
   - Input 6-digit kunci dengan format otomatis dan tombol unduh instan.
   - **Pemindai Kode QR**: Pindai langsung lewat webcam atau unggah gambar QR code.
   - **Kunci Terkini (Recent Keys)**: Riwayat kunci transfer cepat 1-klik.
   - **Unduhan Fleksibel**:
     - Unduh berkas satuan.
     - Unduh semua berkas sekaligus dalam satu arsip **ZIP** (`Kintun_XXXXXX.zip`).

3. **Pengalaman Pengguna (UX & Design)**:
   - Desain modern bernuansa *Coral Red* (`#FF4A4A`), kartu putih bersih, dan tata letak responsif.
   - **Dukungan Multi-Bahasa**: Tombol ganti bahasa instan (Bahasa Indonesia 🇮🇩 & English 🇬🇧).
   - **Efek Suara Sintetis (Web Audio API)**: Suara klik, berhasil kirim, dan notifikasi tanpa dependensi file audio eksternal.
   - **Riwayat Transfer (History)**: Menyimpan riwayat transfer kirim dan terima secara lokal di browser.
   - **Panduan Cara Kerja**: Penjelasan detail tentang mode 6-digit key, tautan berbagi, dan keamanan transfer.

---

## 🌐 Cara Pemasangan & Menjalankan

### Opsi A: cPanel / Shared Hosting (Apache + PHP)
*Sangat cocok untuk hosting web biasa seperti `domainanda.com/kintun` atau subdomain.*

1. Unggah seluruh isi repositori ini ke folder tujuan (misalnya `/public_html/kintun/`).
2. Pastikan file `index.html`, `.htaccess`, dan `api.php` berada di folder utama tersebut.
3. Selesai! Buka `https://domainanda.com/kintun/` di browser.
   - File `.htaccess` akan otomatis mengarahkan panggilan API ke `api.php`.
   - File transfer, pembuatan ZIP, dan pembersihan otomatis ditangani oleh `api.php`.

### Opsi B: Node.js Server (VPS / Cloud / cPanel Node.js App)
1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Jalankan server:
   ```bash
   npm start
   ```
3. Akses via `http://localhost:3000` (atau atur Reverse Proxy Nginx/Apache ke port 3000).

---

## 🛠️ Arsitektur & Teknologi

- **Backend**:
  - `PHP 7.4 - 8.x` (`api.php`): Penanganan multipart upload, ekstraksi kunci, dan pembuatan arsip ZIP native.
  - `Node.js` + `Express` (`server.js`): Alternatif backend dengan WebSocket real-time signaling.
- **Frontend**:
  - Vanilla HTML5, CSS3, & Modern JavaScript (ES6+)
  - `QRCode.js` untuk pembuatan kode QR instan di sisi browser
  - `JSZip` untuk pembuatan ZIP di browser
  - `Html5Qrcode` untuk pemindaian kode QR via kamera/gambar
  - Web Audio API untuk feedback suara interaktif
