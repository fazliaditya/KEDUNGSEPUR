# SAPA KEDUNGSEPUR 2045 — Atlas Pertumbuhan Perkotaan

**SAPA** = Sistem Analisis Pertumbuhan Adaptif. WebGIS penelitian spasial eksploratif KEDUNGSEPUR 2020–2045.

## Menjalankan di Windows

1. Ekstrak **seluruh folder** `SAPA_KEDUNGSEPUR_2045_REVISI_04` ke `D:\LOMBA G-DAYS UI\`.
2. Klik dua kali **`BUKA_SAPA.bat`**, atau buka PowerShell:

   ```powershell
   cd "D:\LOMBA G-DAYS UI\SAPA_KEDUNGSEPUR_2045_REVISI_04"
   py -m http.server 8777
   ```

3. Buka **http://localhost:8777**. Ruang peta: **http://localhost:8777/peta.html**.
4. Jangan menjalankan HTML dengan `file://`, karena GeoJSON membutuhkan HTTP.

Untuk mencoba dari HP di Wi-Fi yang sama: jalankan server dengan `py -m http.server 8777 --bind 0.0.0.0`, cari alamat IPv4 komputer lewat `ipconfig`, lalu buka `http://ALAMAT-IP-PC:8777`. Firewall Windows mungkin perlu mengizinkan koneksi jaringan privat.

## Isi proyek

```text
SAPA_KEDUNGSEPUR_2045_REVISI_04/
├── index.html                 Beranda / isu berita / hasil dan metode
├── peta.html                  Ruang peta interaktif dan panel layer
├── BUKA_SAPA.bat              Shortcut peluncur Windows
├── START_SAPA.ps1             Peluncur PowerShell
├── css/site.css               Sistem desain tunggal (responsif)
├── js/site.js                 Navigasi mobile
├── js/map.js                  Basemap, GeoJSON, LULC, identifikasi, kontrol
├── assets/                   Logo, atlas-hero, gambar berita cadangan
├── data/grid.geojson         4.931 grid dari Notebook 06
├── data/area_studi.geojson   Outline data studi (bukan KSN resmi)
├── data/summary.json         Ringkasan FLUS/SOM dan metadata LULC
├── data/lulc/                PNG bergeoreferensi untuk 2010/2015/2020/2045
└── docs/                     Metadata, kredit media, keterbatasan
```

## Fitur

- Beranda terpisah dari peta dan berita bertaut ke sumber aslinya.
- Pilihan basemap **OpenStreetMap** / **Esri World Imagery (citra satelit)**.
- Pilihan satu layer utama: **SOM**, **LULC 2010**, **2015**, **2020**, **proyeksi 2045**, atau tanpa layer.
- Klik **grid SOM** untuk nilai luas ekspansi, kepadatan, jarak jalan/ekonomi, elevasi, cakupan data bahaya, dan irisan lindung.
- Klik **layer LULC** untuk identifikasi kelas dari piksel gambar bergeoreferensi. Ini adalah identifikasi pratinjau kelas, bukan nilai raster asli resolusi penuh.
- Filter SOM 3 klaster, kontrol opasitas, layer indikator banjir tanpa data dan irisan lindung.
- Batas **area studi model** ditampilkan dengan garis hitam solid dan toggle.
- Mobile: panel layer berbentuk bottom-sheet dan **tetap terbuka saat memilih layer**; tutup dengan tombol ×.
- Pergantian layer, basemap, filter, dan opasitas **mempertahankan posisi/zoom peta serta scroll halaman**. Tombol zoom area studi tetap bekerja seperti biasa.
- Logo/header menggunakan wordmark rata kiri: SAPA di atas KEDUNGSEPUR 2045.
- Tidak ada layer batas kabupaten/kota.

**Koneksi internet diperlukan** untuk memuat Leaflet dari CDN, basemap OSM/Esri, serta foto. Aset visual, GeoJSON SOM, ringkasan, dan LULC disimpan lokal di paket.

## Pembatasan ilmiah

Hasil **masih eksploratif**. Proyeksi 2045 GeoSOS-FLUS bukan observasi; belum terbukti validasi hindcast independen. Interpretasi kelas `Forest` dan asal konversinya memerlukan audit. Raster bahaya hanya diterjemahkan sebagai **cakupan data** karena legenda belum diverifikasi. Irisan lindung belum berarti pelanggaran hukum. Outline studi yang tersedia **bukan delineasi KSN resmi**, dan belum ada layer LP2B/RTRW terverifikasi di proyek ini.

Delineasi kawasan KSN menurut Perpres No. 60 Tahun 2022 tetap harus diperoleh dari sumber resmi untuk penetapan batas KSN yang sah.


## Revisi 04 (14 Oktober 2026)
- Posisi logo dan wordmark header digeser ke tepi kiri, dan kontrol status/Kembali ke tepi kanan.
- Halaman peta dikunci pada tinggi viewport, sementara daftar layer memiliki scroll sendiri; mengaktifkan atau menonaktifkan layer tidak lagi menggulir halaman ke bawah.
- Pergantian SOM dan LULC tidak mengubah tinggi daftar layer; filter SOM dinonaktifkan secara visual saat layer LULC tampil, tanpa menyembunyikan bagian panel.
- Koordinat pusat dan zoom Leaflet tetap dipertahankan pada setiap pergantian layer.
- Opsi batas kabupaten/kota tetap tidak ditampilkan.
