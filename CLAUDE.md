# CLAUDE.md

Panduan konteks untuk asisten AI yang bekerja di repositori ini.

---

## Proyek

**PajakWajar** — platform web pra-lapor pajak untuk pekerja lepas, kreator konten, dan pelaku usaha mikro di Indonesia.

Dibuat untuk **ITechno Cup 2026** (Web Development, tingkat mahasiswa nasional). Tenggat pengumpulan **6 September 2026, 23.59 WIB**; target internal submit 5 September.

**Tim:** Sheva (rule engine) · Mikail (frontend) · Habib (integrasi, OCR, dokumentasi)

---

## Yang membedakan produk ini

Semua kalkulator pajak yang ada — OnlinePajak, Pajakku, TaxCalc, bahkan aplikasi resmi M-Pajak DJP — langsung menghitung angka. Mereka mengasumsikan pengguna sudah tahu skema mana yang berhak dia pakai.

PajakWajar menempatkan **uji kelayakan di hulu**: memeriksa dulu skema apa yang sah secara hukum, baru menghitung.

Urutannya selalu:

```
KELAYAKAN → PERHITUNGAN → KONSEKUENSI → BERKAS
```

Kalau ada usulan perubahan yang membalik urutan ini, tolak.

---

## Aturan yang tidak boleh dilanggar

### 1. Deterministik, bukan generatif

**Tidak ada LLM yang boleh memutuskan hak hukum seseorang.** Seluruh keputusan kelayakan dan seluruh perhitungan pajak lahir dari aturan yang ditulis eksplisit di kode dan data.

AI hanya boleh dipakai untuk satu hal: **OCR bukti potong** (mengubah gambar jadi angka terstruktur). Bahkan di situ pun wajib ada mode input manual.

Kalau diminta "pakai AI untuk menentukan skema terbaik" — jangan. Jelaskan kenapa.

### 2. Setiap vonis wajib bersitasi

Setiap keputusan kelayakan menyertakan dasar hukumnya. Tidak ada keluaran tanpa `dasarHukum`.

### 3. Jangan mengarang regulasi

Kalau tidak yakin isi suatu pasal, **jangan tebak.** Tandai `TODO: verifikasi ke JDIH` dan beri tahu manusianya.

Angka pajak yang salah menyebabkan pengguna kurang bayar dan kena sanksi. Ini bukan risiko nilai lomba — ini kerugian nyata orang lain.

### 4. Client-side

Perhitungan berjalan di peramban. Tidak ada data finansial atau identitas yang disimpan di server.

**Satu pengecualian:** foto bukti potong dikirim ke layanan OCR, dan itu **wajib** dengan persetujuan eksplisit pengguna. Jangan menulis klaim "zero data retention" tanpa kualifikasi ini — klaim itu tidak akurat selama OCR aktif.

### 5. Ini bukan nasihat pajak

Penafian tampil di layar dan di PDF. Sistem selalu mengarahkan verifikasi ke DJP.

---

## Konteks regulasi

Aturan berubah pada **22 April 2026** lewat **PP No. 20 Tahun 2026** (merevisi PP 55/2022). Banyak artikel dan blog konsultan **masih memuat ketentuan lama** — jangan pernah memakainya sebagai sumber.

Perubahan pokok, seluruhnya sudah dicocokkan ke teks asli pada 5 September 2026:
- **Pasal 59 dihapus**, sehingga batas waktu 7 tahun untuk WP Orang Pribadi hilang
- Penerima fasilitas dipersempit: WP orang pribadi, perseroan perorangan, koperasi — Pasal 57 ayat (1)
- Ambang Rp4,8 miliar diukur dari **Tahun Pajak sebelumnya** — Pasal 58 ayat (1) huruf a
- Ambang itu dihitung **gabungan**: WP beserta seluruh perseroan perorangannya (Pasal 57 ayat (2) huruf e), ditambah omzet pasangan (Pasal 58 ayat (2) dan (3) untuk pisah harta atau istri yang melapor sendiri; UU PPh Pasal 8 ayat (1) untuk pasangan yang melapor gabungan). Pengecualiannya hanya pasangan yang hidup berpisah berdasarkan putusan hakim.
- Pekerjaan bebas **dilarang** memakai PPh Final 0,5% — Pasal 56 ayat (3) huruf a jo. ayat (4). Kreator konten daring disebut **secara eksplisit** pada ayat (4) huruf b, sehingga tidak lagi bergantung pada penegasan DJP.

**Sumber yang boleh dipakai:** jdih.kemenkeu.go.id, pajak.go.id, teks PP/PMK/PER langsung.
**Sumber yang tidak boleh:** blog konsultan, artikel media, ringkasan pihak ketiga.

Salinan teks asli PP 20/2026 yang dipakai tersimpan di `docs/sumber/pp-20-2026.txt`. Register lengkap beserta kutipannya ada di `docs/REGULASI.md`.

### Empat hal yang dulu belum pasti — semuanya sudah terverifikasi

1. **Dasar pengenaan pembebasan Rp500 juta** — dari **omzet pribadi**, bukan konsolidasi. UU PPh Pasal 7 ayat (2a) hasil perubahan UU HPP. Omzet konsolidasi hanya dipakai untuk uji ambang.
2. **Konsekuensi memilih tarif umum** — hak 0,5% tertutup untuk **Tahun Pajak-Tahun Pajak berikutnya**. Dasarnya Pasal 57 ayat (4), bukan Pasal 59 yang sudah dihapus. Aturan yang sama juga mengunci WP yang omzetnya pernah melewati Rp4,8 miliar.
3. **Daftar KLU pekerjaan bebas** — Pasal 56 ayat (4) huruf a sampai k. Profesi yang tidak disebut satu per satu, misalnya programmer lepas, desainer, dan fotografer, harus menghasilkan `PERLU_DIPASTIKAN`, bukan vonis pasti.
4. **Ketentuan peralihan** — Pasal II angka 1 huruf a. WP OP yang jangka waktunya berakhir pada Tahun Pajak 2024 dapat memakai PP ini untuk Tahun Pajak 2025 dan 2026; yang berakhir pada 2025 hanya untuk 2026.

**Klasifikasi kegiatan:** 22 kegiatan KLU pada `data/klu_rules.json` sudah dicocokkan ke KBLI 2020 pada 6 September 2026; padanan terpisah dari kode Norma, dengan batas cakupan di `docs/KLU-KBLI-2020.md`. KBLI 2025 sudah diterbitkan dan bukan versi yang dikonversi oleh pemetaan ini.

**Yang masih terbuka:** PDF PP 55/2022 di JDIH berupa pindaian gambar, sehingga Pasal 60 belum dapat dikutip langsung dan sitasinya ditandai `DALAM_REVIEW`.

---

## Tumpukan teknologi

- **Next.js 15** (App Router, React 19, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **React Hook Form** + **Zod**
- **@react-pdf/renderer** untuk kertas kerja
- **Gemini API** (structured JSON) — hanya untuk OCR bupot, dengan mode manual
- **Vercel** untuk deployment

Tidak ada basis data. Tidak ada backend. Semua state di memori peramban.

---

## Struktur repo

```
pajakwajar/
├── README.md                 ← template resmi ITechno Cup
├── CLAUDE.md
├── .env.example              ← tanpa nilai asli
├── docs/
│   ├── ARSITEKTUR.md
│   ├── REGULASI.md           ← kutipan pasal + nomornya
│   └── screenshots/
├── data/
│   └── klu_rules.json        ← aturan terpisah dari kode
├── src/
│   ├── app/
│   │   └── api/ocr-bupot/    ← perantara kunci API, satu-satunya endpoint
│   ├── components/
│   │   ├── eligibility/      ← formulir, kartu vonis, input bukti potong
│   │   └── berkas/           ← kertas kerja PDF
│   ├── lib/
│   │   ├── regulasi.ts       ← pemuat bertipe untuk data aturan
│   │   ├── eligibility.ts    ← Sheva; saringan kelayakan, tanpa aritmetika
│   │   ├── calculator.ts     ← Sheva; fungsi murni, tanpa penilaian hukum
│   │   ├── index.ts          ← orkestrator auditPajakMandiri
│   │   ├── schemas.ts        ← Zod
│   │   ├── ocr.ts            ← Habib
│   │   └── format.ts
│   ├── mock/                 ← profil contoh untuk demo dan tangkapan layar
│   └── types/
└── tests/                    ← schema, calculator, eligibility, audit, ocr
```

**Aturan penting:** aturan perpajakan tinggal di `data/klu_rules.json`, **bukan** di dalam kode. Regulasi berubah; logika tidak.

---

## Kontrak tipe

Kontrak lengkap ada di `src/types/pajak.ts`. Intinya:

```ts
type ProfilWajibPajak = {
  tahunPajak: 2025 | 2026;
  kluKode: string;
  wilayah: 'kelompok1' | 'kelompok2' | 'kelompok3';   // norma berbeda per wilayah
  statusPtkp: 'TK/0' | ... | 'K/3';
  bentukKegiatan: 'PEKERJAAN_BEBAS' | 'USAHA_JASA' | 'USAHA_DAGANG' | 'BELUM_PASTI';
  statusPerpajakanPasangan: 'TIDAK_ADA_PASANGAN' | 'GABUNG' | 'PISAH_HARTA'
                          | 'PISAH_KEWAJIBAN' | 'PISAH_PUTUSAN_HAKIM' | 'TIDAK_YAKIN';
  punyaLebihDariSatuKegiatan: boolean | 'tidak_yakin';

  omzetPribadiTahunPajak: number;                     // dasar PERHITUNGAN
  biayaOperasionalRiil?: number;                      // undefined bukan 0

  omzetPribadiThnSebelumnya: number;                  // hanya untuk uji AMBANG
  omzetPasanganThnSebelumnya: number;                 // hanya untuk uji AMBANG
  omzetSeluruhPerseroanPeroranganThnSebelumnya: number;

  sudahMemberitahukanNppn: boolean | 'tidak_yakin';
  pernahPilihTarifUmum: boolean | 'tidak_yakin';
  jugaPegawaiTetap: boolean;
};
```

Bukti potong dipisahkan dari profil lewat `InputAuditPajak = { profil, kreditPajak }`, supaya OCR tidak pernah mencampuri data profil.

Hasil per skema memakai **discriminated union** pada `statusKalkulasi`: hanya `TERSEDIA` yang boleh membawa `pajakTerutang` dan `rincianKalkulasi`; `BELUM_TERSEDIA` dan `TIDAK_RELEVAN` wajib membawa `alasanKalkulasi` dan tidak boleh membawa nominal.

**Dua himpunan omzet punya fungsi berbeda.** Jangan pernah mencampurnya:
- Perhitungan pajak dan uji ambang NPPN memakai `omzetPribadiTahunPajak`
- Uji ambang PPh Final Rp4,8 M memakai jumlah ketiga field `...ThnSebelumnya`

Status **`PERLU_DIPASTIKAN`** dipakai saat pengguna menjawab "tidak yakin". Sistem tidak boleh memberi vonis pasti dari data yang tidak pasti.

---

## Rumus

**PPh Final UMKM**
```
dasar = max(0, omzetPribadiTahunPajak − 500_000_000)
pajak = dasar × 0,005
```

**Norma NPPN**
```
netto = omzetPribadiTahunPajak × persenNorma(klu, wilayah)
pkp   = max(0, netto − ptkp)
pajak = max(0, tarifProgresifBerlapis(pkp) − kreditBupot)
```

**Tarif Umum**
```
netto = max(0, omzetPribadiTahunPajak − biayaOperasional)
pkp   = max(0, netto − ptkp)
pajak = max(0, tarifProgresifBerlapis(pkp) − kreditBupot)
```

Contoh resmi untuk menguji tarif berlapis ada pada penjelasan UU HPP atas Pasal 17 ayat (1) huruf a: PKP Rp6.000.000.000 menghasilkan PPh terutang **Rp1.794.000.000**. Angka itu dipakai sebagai fixture di `tests/calculator.test.ts`.

**Tarif progresif dihitung berlapis**, bukan satu tarif untuk seluruh PKP. Ini kesalahan paling umum. Contoh: PKP Rp337 juta melewati tiga lapisan, bukan langsung dikalikan 25%.

Persentase norma **berbeda per wilayah**. Struktur data harus mengakomodasi.

---

## Gaya kode

- Bahasa Indonesia untuk nama domain (`omzetPribadi`, `hitungPajakFinal`)
- Bahasa Inggris untuk istilah teknis umum (`useState`, `formatCurrency`)
- Pesan commit bahasa Inggris, format konsisten: `feat:`, `fix:`, `docs:`
- Tidak ada `any`
- Setiap fungsi di `lib/` punya JSDoc dengan rujukan pasalnya

Bekerja di cabang: `feat/rule-engine` (Sheva), `feat/ui-eligibility` (Mikail), `feat/ocr-pdf` (Habib). Jangan push langsung ke `main`.

---

## Penulisan antarmuka

- **Hindari istilah birokrasi sebagai label.** Tulis "Apakah Anda pernah memberi tahu DJP bahwa Anda memakai Norma?" dengan keterangan kecil "(layanan AS.04-01 di Coretax)". Kode layanannya **AS.04-01**, bukan LA.04-01.
- **Kata kerja aktif.** "Hitung pajak saya", bukan "Submit".
- **Nama tindakan konsisten** dari tombol sampai hasilnya.
- **Pesan galat menjelaskan** apa yang salah dan cara memperbaikinya. Tidak minta maaf, tidak kabur.
- Opsi **"Tidak yakin" harus terlihat setara** dengan opsi lain, bukan disembunyikan.

---

## Yang tidak boleh dilakukan

- ❌ Memakai LLM untuk memutuskan kelayakan atau menghitung pajak
- ❌ Mengarang isi pasal atau nomor regulasi
- ❌ Menyitasi **Pasal 59 PP 20/2026** — pasal itu dihapus; pintu satu arah ada di Pasal 57 ayat (4)
- ❌ Memakai omzet konsolidasi sebagai dasar perhitungan
- ❌ Memakai omzet tahun berjalan untuk uji ambang Rp4,8 miliar; ambang itu memakai tahun sebelumnya
- ❌ Menganggap `biayaOperasionalRiil` yang kosong sebagai Rp0
- ❌ Mengalikan omzet gabungan dengan satu persentase norma bila kegiatannya lebih dari satu (PER-17/PJ/2015 Pasal 5)
- ❌ Menghitung tarif progresif dengan satu tarif tunggal
- ❌ Meng-commit `.env` atau kunci API
- ❌ Menyembunyikan skema yang TIDAK BOLEH — tetap tampilkan, redam saja
- ❌ Membangun OCR sebelum mode manual berfungsi
- ❌ Mengklaim "zero data retention" tanpa kualifikasi soal OCR

---

## Konteks lomba

**Bobot penyisihan:** Kesesuaian Tema 20% · Inovasi 20% · Fungsionalitas 20% · UI/UX 15% · Implementasi Teknologi 15% · Dokumentasi 10%

**Bobot final:** Presentasi 25% · Live Demo 25% · Inovasi & Dampak 20% · Aspek Teknis 20% · Tanya Jawab 10%

**SDG:** 8 (Pekerjaan Layak — melindungi pekerja mandiri dari sanksi yang tidak perlu) dan 9 (Infrastruktur — mesin aturan perpajakan deterministik).

**Guidebook:** template instan dilarang; framework boleh tapi peruntukannya wajib dijelaskan di dokumentasi; penggunaan AI diizinkan dengan tanggung jawab penuh atas etika, perlindungan data, privasi, dan hak cipta.

Di babak final, juri berhak menanyai anggota mana pun soal bagian mana pun. **Kode yang tidak bisa dijelaskan pemiliknya adalah kewajiban, bukan aset.**
