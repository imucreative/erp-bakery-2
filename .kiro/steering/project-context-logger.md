---
inclusion: always
---

# Project Context Logger — Aturan Wajib untuk Semua AI

Aturan ini WAJIB dipatuhi oleh setiap AI (model apa pun, agent apa pun) yang
bekerja di project ERP Bakery ini. Tujuannya: menjaga kontinuitas konteks
pengembangan lintas sesi, lintas model, dan lintas agent melalui catatan
naratif (story-telling) yang tidak pernah putus.

## Prinsip Inti

Setiap kali AI **menganalisa kode** atau **menghasilkan/mengubah kode** di
project ini, AI HARUS mencatat apa yang dilakukan ke dalam file log konteks
project. Catatan bersifat **append-only** dan berbentuk **narasi kronologis**,
seolah menceritakan perjalanan pengembangan hari demi hari.

## Lokasi & Penamaan File

- Folder: `knowledge-base/project-context/`
- Nama file: `YYYY-MM-DD.md` (tanggal hari ini, contoh: `2026-09-28.md`)
- Satu file per hari.

## Aturan Append vs File Baru

1. **Masih di hari yang sama** → APPEND entri baru ke AKHIR file
   `knowledge-base/project-context/YYYY-MM-DD.md` milik hari ini. JANGAN
   menimpa atau menghapus entri sebelumnya.
2. **Sudah ganti hari** → BUAT file baru dengan nama tanggal hari ini. Jangan
   menyentuh file hari-hari sebelumnya.
3. Selalu tentukan tanggal "hari ini" dari konteks tanggal yang tersedia di
   sesi (system date). Jika tidak yakin apakah file hari ini sudah ada, periksa
   folder `knowledge-base/project-context/` lebih dulu.

## Kapan Wajib Mencatat

Catat SETELAH menyelesaikan salah satu dari berikut:

- Menganalisa / menelaah bagian codebase (arsitektur, modul, bug, dependency).
- Membuat atau mengubah kode (file baru, refactor, bugfix, test).
- Menjalankan verifikasi penting (build, test, migrate, seed) dengan hasilnya.
- Mengambil keputusan desain/arsitektur yang memengaruhi arah pengembangan.

Untuk pertanyaan sepele yang tidak menyentuh atau menganalisa kode (misalnya
basa-basi atau klarifikasi singkat), pencatatan tidak diwajibkan.

## Format Entri (Story-Telling)

Setiap entri diawali heading waktu, lalu narasi. Gunakan struktur ini:

```
## [HH:MM] Judul singkat aktivitas — <model/agent bila diketahui>

Narasi kronologis: apa yang diminta user, apa yang saya (AI) analisa atau
kerjakan, keputusan penting yang diambil dan alasannya, hasil verifikasi
(build/test), serta apa yang menjadi langkah berikutnya.

- File yang dibuat/diubah: (daftar path)
- Hasil verifikasi: (mis. tsc bersih; jest 532/532 pass)
- Keputusan penting: (bila ada)
- Langkah berikutnya: (bila ada)
```

Tulis narasi dalam Bahasa Indonesia, ringkas tapi cukup detail agar AI lain
bisa melanjutkan tanpa kehilangan konteks. Jangan menyalin seluruh isi kode;
cukup jelaskan maksud, keputusan, dan lokasi file.

## Header File Harian

Saat MEMBUAT file harian baru, awali dengan header berikut sebelum entri
pertama:

```
# Project Context — YYYY-MM-DD

Catatan naratif kronologis aktivitas pengembangan ERP Bakery pada hari ini.
Append-only. Jangan menimpa entri sebelumnya.

---
```

## Alur Wajib Sebelum Generate/Analisa Kode

1. Sebelum mulai kerja besar, baca file konteks hari ini (bila ada) dan file
   hari terakhir sebelumnya untuk memahami di mana pengembangan terhenti.
2. Kerjakan tugas.
3. Setelah selesai (atau setelah milestone penting), APPEND entri baru sesuai
   format di atas.

## Larangan

- JANGAN mengubah atau menghapus entri lama.
- JANGAN memindahkan catatan ke file tanggal yang salah.
- JANGAN melewatkan pencatatan setelah menghasilkan/mengubah kode.
