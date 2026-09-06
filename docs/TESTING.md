# Audit kesiapan 6 September 2026

Pemeriksaan terbaru menggantikan status pada laporan 5 September di bawah. Lingkungan: Windows, Node.js 24.19.0, Next.js 15.5.23, Vitest 3.2.7, Chromium lewat Playwright CLI.

- 141 tes rutin pada 9 berkas; satu tes layanan nyata hanya berjalan lewat `npm run test:ocr` dengan API key.
- OCR nyata berhasil membaca gambar sintetis `tests/fixtures/contoh-bupot.png`: nomor 1.2-08.26-0000123, bruto Rp120.000.000 dan PPh Rp6.000.000.
- Lint, pemeriksaan tipe, dan build produksi diperiksa kembali setelah perubahan.
- `npm audit`: 0 kerentanan sesudah pembaruan Vitest dan override PostCSS/sharp.
- Lima tes saran memastikan rekomendasi hanya memakai skema terhitung, membandingkan pajak sebelum kredit dengan basis yang sama, menyebut nilai seri, serta meminta data keluarga ketika belum lengkap.
- Regresi mencakup PKP Rp60.000.999 yang dibulatkan menjadi Rp60.000.000, neto pecahan, penggabungan gaji, kelebihan kredit, duplikasi bupot, dan batas cakupan keluarga/riwayat final.
- Browser: enam langkah, validasi pekerjaan wajib, nominal dengan pemisah ribuan, kredit manual, draf belum disimpan, hasil kreator, navigasi kembali, unduhan PDF, dan lebar seluler/desktop.
- PDF contoh kreator dan pedagang dirender lalu diperiksa secara visual. Ringkasan di halaman pertama, satu halaman rincian per skema, dan saran pada halaman terakhir; seluruh halaman memiliki nomor, tidak ada teks di luar halaman. Contoh tersimpan di `docs/demo/contoh-kertas-kerja.pdf`.

Perhitungan yang memerlukan data di luar formulir ditandai belum tersedia. Tes perangkat lunak tidak menggantikan pemeriksaan aturan oleh praktisi pajak. Uji OCR memakai dokumen karangan, bukan data pengguna.

---

## Arsip pemeriksaan sebelumnya (5 September)

# Pemeriksaan PajakWajar

Tanggal pemeriksaan: **5 September 2026**. Lingkungan: Windows 11, Node.js 24.19.0, npm, build Next.js produksi lokal, dan Chromium (Playwright 1.63) pada server produksi lokal.

## Perintah

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

| Pemeriksaan | Hasil |
|---|---|
| ESLint | Lulus tanpa error atau warning. |
| TypeScript | Lulus. Tidak ada `any` di `src/` maupun `tests/`. |
| Vitest | **116 tes lulus** pada 7 berkas, 1 tes dilewati (butuh `GEMINI_API_KEY`). |
| Build produksi | Berhasil: `/`, `/cek-kelayakan`, `/api/ocr-bupot`, dan halaman 404. |

## Cakupan tes

| Berkas | Jumlah | Yang dibuktikan |
|---|---|---|
| `tests/schema.test.ts` | 11 | `data/klu_rules.json` lolos JSON Schema Draft 2020-12 lewat Ajv dengan `additionalProperties: false`; berkas dengan properti asing ditolak; seluruh URL dasar hukum berada di domain sumber primer; tidak ada sitasi ke Pasal 59 PP 20/2026 yang sudah dihapus; pembebasan Rp500 juta dirujuk ke UU HPP dan PP 55/2022, bukan PP 20/2026; kode KLU unik; lapisan tarif bersambung tanpa celah; angka kunci cocok dengan fixture; **persentase norma ke-22 KLU dikunci pada fixture yang disalin baris per baris dari Lampiran I PER-17/PJ/2015**, dan norma tidak pernah naik dari kelompok 1 ke kelompok 3. |
| `tests/calculator.test.ts` | 14 | Tarif progresif berlapis, termasuk kasus PKP Rp337 juta yang melewati tiga lapisan dan secara eksplisit tidak sama dengan PKP × 25%; PKP tepat di batas lapisan; lapisan teratas tanpa batas atas; pembebasan Rp500 juta; norma pecahan seperti 47,5%; kredit bupot yang melebihi pajak tidak menghasilkan nilai negatif; **contoh resmi penjelasan Pasal 17 ayat (1) huruf a UU HPP** (PKP Rp6.000.000.000 → PPh Rp1.794.000.000). |
| `tests/eligibility.test.ts` | 32 | Agregasi prioritas `TIDAK_BOLEH > PERLU_DIPASTIKAN > BOLEH`; empat saringan kelayakan; ambang Rp4,8 miliar yang inklusif; pemisahan omzet tahun berjalan dan tahun sebelumnya; penggabungan pasangan untuk seluruh status, termasuk pengecualian hidup berpisah menurut putusan hakim; perseroan perorangan; KLU tak dikenal; setiap skema membawa dasar hukum; peringatan peralihan 2025 dan penghasilan campuran. |
| `tests/audit-pajak.test.ts` | 13 | Validasi Zod pada orkestrator; `TERSEDIA` selalu membawa nominal dan rincian bertipe sesuai skemanya; status lain tidak pernah membawa nominal; kalkulasi yang diblokir tidak menurunkan status kelayakan; multi-kegiatan memblokir NPPN; tarif umum tanpa biaya usaha berstatus `BELUM_TERSEDIA`, bukan memakai Rp0; kredit pajak terpisah dari profil. |
| `tests/schemas.test.ts` | 15 | Kontrak masukan formulir: nilai negatif, teks, `NaN`, `Infinity`, tahun di luar cakupan, wilayah tak dikenal, jawaban kepatuhan tak sah, dan perbedaan antara biaya usaha yang dikosongkan (`undefined`) dan biaya usaha Rp0. |
| `tests/format.test.ts` | 13 | Pemisah ribuan pada isian nominal: penyisipan titik setiap tiga digit, pembuangan nol di depan, penolakan karakter selain angka, letak karet setelah teks diformat ulang, dan jaminan bahwa nilai yang diformat lalu dibaca ulang tetap sama sehingga titik tidak pernah bocor ke perhitungan. |
| `tests/ocr.test.ts` | 18 + 1 dilewati | Gerbang persetujuan tidak dapat dilewati dan tidak menyentuh jaringan; batas jenis dan ukuran berkas; route menjawab 503 tanpa kunci API, 403 tanpa persetujuan, 415, 413, 400, 502, dan 422 untuk jawaban model yang tidak sesuai kontrak; permintaan ke Gemini memakai `temperature: 0` dan `responseSchema`. Satu tes terhadap layanan Gemini sungguhan hanya berjalan bila `GEMINI_API_KEY` tersedia. |

Angka coverage belum diukur.

## Pemeriksaan browser

Alur enam langkah dijalankan otomatis dengan Playwright pada server produksi lokal, ukuran desktop 1440 × 1100 dan seluler 390 × 844. **Tidak ada error atau warning di konsol pada seluruh skenario.**

### Skenario A — pedagang daring (KLU 47919, tahun pajak 2026)

Omzet berjalan Rp900.000.000, biaya usaha Rp620.000.000, omzet tahun sebelumnya Rp780.000.000, PTKP TK/0, sudah memberitahukan Norma, belum pernah memilih tarif umum, satu bukti potong Rp1.500.000.

| Skema | Vonis | Perkiraan | Diperiksa manual |
|---|---|---|---|
| PPh Final 0,5% | BOLEH | Rp2.000.000 | (900jt − 500jt) × 0,5% ✓ |
| Norma NPPN | BOLEH | Rp24.900.000 | neto 30% = 270jt; PKP 216jt; 3jt + 23,4jt − 1,5jt ✓ |
| Tarif umum | BOLEH | Rp26.400.000 | neto 280jt; PKP 226jt; 3jt + 24,9jt − 1,5jt ✓ |

### Skenario B — kreator konten (KLU 90002, tahun pajak 2026)

Omzet berjalan Rp420.000.000, biaya usaha Rp95.000.000, omzet tahun sebelumnya Rp310.000.000, PTKP TK/0, satu bukti potong Rp6.000.000.

| Skema | Vonis | Perkiraan | Diperiksa manual |
|---|---|---|---|
| PPh Final 0,5% | TIDAK BOLEH | tidak ditampilkan | Pasal 56 ayat (4) huruf b ✓ |
| Norma NPPN | BOLEH | Rp11.400.000 | neto 50% = 210jt; PKP 156jt; 3jt + 14,4jt − 6jt ✓ |
| Tarif umum | BOLEH | Rp30.750.000 | neto 325jt; PKP 271jt; 3jt + 28,5jt + 5,25jt − 6jt ✓ |

Saat jawaban pemberitahuan Norma diisi “Tidak yakin”, NPPN berubah menjadi PERLU DICEK DULU dan nominalnya tidak ditampilkan — sesuai aturan bahwa perhitungan tidak boleh mendahului kelayakan.

### Ekspor PDF

Tombol **Simpan ringkasan sebagai PDF** menghasilkan `kertas-kerja-pajakwajar-2026.pdf` di peramban. Isi berkas diperiksa dengan mengekstrak lapisan teksnya: penafian, data isian, tiga kartu vonis beserta alasan dan sitasi pasal, rincian perhitungan berlapis, langkah tindak lanjut, dan nomor halaman semuanya muncul. Contoh keluarannya disimpan di [`docs/demo/contoh-kertas-kerja.pdf`](demo/contoh-kertas-kerja.pdf).

### Tangkapan layar

`docs/screenshots/` diambil ulang dari build produksi pada 5 September 2026: `formulir.png`, `hasil-kelayakan.png`, `hasil-mobile.png`. `landing-desktop.png` dan `landing-mobile.png` belum berubah sejak halaman depan tidak diubah.

## Pencocokan regulasi

Pada 5 September 2026 seluruh parameter dicocokkan ke teks asli. Hasilnya: **17 dari 20 KLU semula memuat persentase norma yang salah, atau kode yang tidak ada di Lampiran I**, dan sitasi pintu satu arah menunjuk pasal yang sudah dihapus. Seluruhnya sudah dikoreksi dan dikunci pada fixture uji. Rincian perbandingan sebelum dan sesudah ada di [`docs/REGULASI.md`](REGULASI.md).

## Yang belum diuji

- **Layanan OCR sungguhan.** Seluruh gerbang, batas, dan penanganan galat sudah diuji dengan layanan disimulasikan (18 tes lulus). Panggilan ke Gemini yang sebenarnya **belum pernah dijalankan** karena membutuhkan `GEMINI_API_KEY`. Tesnya sudah disiapkan beserta gambar contoh `tests/fixtures/contoh-bupot.png`; jalankan dengan:

  ```bash
  cp .env.example .env.local   # lalu isi GEMINI_API_KEY
  npm run test:ocr
  ```

  Cara memperoleh kuncinya ada di [`docs/DEPLOYMENT.md`](DEPLOYMENT.md). `tests/setup-env.ts` memuat `.env.local` ke `process.env` karena Vitest tidak melakukannya sendiri seperti Next.js.

  Tes itu memeriksa apakah model membaca Rp120.000.000 dan Rp6.000.000 dari lembar contoh. Selama kunci tidak ada, tes tersebut dilewati dan tidak ada gambar yang dikirim ke mana pun.
- **Deployment publik.** Belum ada URL produksi. Langkahnya ada di [`docs/DEPLOYMENT.md`](DEPLOYMENT.md).
- **Kode KLU terhadap KBLI 2020.** Persentase norma sudah dicocokkan baris per baris ke Lampiran I PER-17/PJ/2015 dan dikunci pada fixture uji. Namun Lampiran I memakai KLU menurut KEP-233/PJ/2012, sehingga kodenya belum tentu sama dengan kode KBLI yang tercatat pada profil Wajib Pajak di Coretax. Lihat [`docs/REGULASI.md`](REGULASI.md).
- **PP 55/2022 Pasal 60.** PDF di JDIH berupa pindaian gambar sehingga pasalnya belum dapat dikutip langsung. Substansinya sudah ditopang UU PPh Pasal 7 ayat (2a) yang terbaca utuh.
- **Uji komponen React.** Verifikasi antarmuka bergantung pada Playwright, bukan uji komponen.

## Kerentanan dependensi

`npm audit` melaporkan 8 temuan: 3 moderate, 4 high, 1 critical. Seluruhnya transitif. Ditelusuri satu per satu, tidak ada yang dapat dieksploitasi pada aplikasi ini: yang *critical* (`vitest`) hanya berlaku saat Vitest UI berjalan sedangkan `@vitest/ui` tidak terpasang; `sharp` hanya dipakai `next/image` yang tidak dipakai proyek ini; `postcss` berjalan saat build atas CSS milik sendiri; `esbuild` dan `vite` menyangkut dev server. Perbaikannya menuntut `next@16` dan `vitest@5`, sehingga **sengaja ditunda sampai setelah tenggat**. Analisis dan perintahnya ada di [`docs/DEPLOYMENT.md`](DEPLOYMENT.md).

Pemeriksaan ini tidak menyatakan aplikasi siap dipakai untuk melapor pajak.

Konfigurasi lint mengikuti [dokumentasi ESLint Next.js 15](https://nextjs.org/docs/15/pages/api-reference/config/eslint).
