# Kintun - Kirim & Terima Berkas Cepat & Aman

**Kintun** adalah aplikasi web transfer berkas modern yang terinspirasi dari arsitektur Send Anywhere. Kintun memungkinkan pengguna berbagi file secara langsung lintas perangkat tanpa batasan akun, dengan antarmuka bersih dan performa tinggi.

---

## 🚀 Fitur Utama

1. **Kirim Berkas (Send)**:
   - **Multi-File & Folder**: Drag & drop atau pilih banyak file dan folder sekaligus.
   - **Mode 1: Transfer Langsung (Kunci 6-Digit)**:
     - Kunci 6-digit numerik unik dibuat instan (contoh: `482 915`).
     - Hitung mundur 10 menit (*live countdown timer*).
     - Kode QR dinamis untuk dipindai langsung dari kamera smartphone.
     - Deteksi penerima secara real-time melalui WebSocket.
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

## 🛠️ Arsitektur & Teknologi

- **Backend**:
  - `Node.js` + `Express`
  - `ws` (WebSocket) untuk sinyal real-time dan notifikasi koneksi peer
  - `multer` untuk penanganan multipart upload berkas
  - `archiver` (`ZipArchive`) untuk pengemasan streaming zip instan
  - Auto-cleanup: Berkas kedaluwarsa dibersihkan secara otomatis dari penyimpanan
- **Frontend**:
  - Vanilla HTML5, CSS3, & Modern JavaScript (ES6+)
  - `QRCode.js` untuk pembuatan kode QR instan di sisi browser
  - `JSZip` untuk pembuatan ZIP di browser
  - `Html5Qrcode` untuk pemindaian kode QR via kamera/gambar
  - Web Audio API untuk feedback suara interaktif

---

## 📦 Menjalankan Aplikasi

```bash
# Masuk ke direktori
cd /home/antigravity/send-anywhere-replica

# Jalankan server
npm start
```

Aplikasi berjalan pada `http://localhost:3000`.
