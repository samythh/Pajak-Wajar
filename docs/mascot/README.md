# Waji, maskot PajakWajar

Waji adalah karakter lembar catatan dengan sudut terlipat, tangan dan kaki biru, serta ekspresi ramah. Nama berasal dari PajakWajar. Maskot mendampingi pengguna pada sambutan, proses, dan ringkasan siap. Gerakan berhasil menunjukkan proses selesai, bukan keputusan bahwa pengguna berhak memakai semua skema pajak.

- `waji-source.png`: gambar sumber dari tool imagegen bawaan, dibuat 6 September 2026.
- `../../public/mascot/waji.webp`: aset produksi transparan, 512 × 512, sekitar 29 KB. Dikonversi menggunakan Sharp dengan kualitas WebP 85; gambar sumber dipertahankan.
- `../../src/components/ui/Maskot.tsx`: komponen dekoratif dengan tiga suasana. Teks status tetap tersedia untuk pembaca layar.
- Gerakan sambutan dan keberhasilan hanya sekali; gerakan berulang hanya saat proses aktif. Seluruh gerakan maskot berhenti ketika `prefers-reduced-motion: reduce`.

Pembuatan memakai **tool imagegen bawaan**, bukan panggilan API dari aplikasi. Aplikasi hanya menyajikan aset statis ini; tidak memerlukan kunci API tambahan.

## Variasi pose untuk setiap langkah

Empat aset tambahan dibuat dengan tool imagegen bawaan menggunakan Waji asli sebagai referensi identitas. Sumber final tersedia pada `waji-berpikir-source.png`, `waji-memberitahu-source.png`, `waji-memeriksa-source.png`, dan `waji-selesai-source.png`. Versi produksi ada di `public/mascot/` dengan nama yang sama tanpa `-source`, dalam format WebP 512 × 512. Total empat aset produksi sekitar 76 KB; tiap gambar sekitar 10–30 KB.

Pose berpikir dan selesai memakai latar putih bersih, sementara pose memberi petunjuk dan memeriksa memiliki alpha transparan. Keduanya disajikan pada panel putih yang sesuai. Semua perubahan visual dilakukan melalui imagegen; Sharp hanya dipakai untuk ukuran dan kompresi WebP. Prompt pembuatan dan perapian final dicatat di [poses.json](poses.json).

| Tampilan | Pose | Peran |
|---|---|---|
| Beranda dan langkah 1 | Menyapa | Sambutan dan memilih tahun penghasilan |
| Langkah 2 | Berpikir | Memilih pekerjaan |
| Langkah 3 | Memeriksa catatan | Mengisi keluarga, uang masuk, dan biaya |
| Langkah 4 | Berpikir | Membedakan catatan tahun sebelumnya |
| Langkah 5 | Memberi petunjuk | Mengingat riwayat pilihan pajak |
| Langkah 6 | Memeriksa catatan | Mencocokkan bukti potong |
| Loading halaman, OCR, dan ringkasan | Memeriksa catatan | Pendamping status proses |
| Ringkasan siap | Merayakan | Menunjukkan proses selesai |
| Saran hasil | Memberi petunjuk | Mendampingi tindak lanjut yang sudah dihitung sistem |
| Halaman tidak ditemukan | Berpikir | Membantu kembali ke beranda |

Petunjuk langkah adalah teks tetap dari antarmuka, tidak dipersonalisasi oleh AI. Animasi di formulir berjalan paling lama 4,4 detik; hanya proses aktif yang berulang terus. Pengaturan kurangi gerakan meniadakan semua animasi maskot. Maskot dekoratif tidak masuk urutan fokus; petunjuk tetap berupa teks biasa.

## Prompt maskot awal

```text
Use case: stylized-concept. Asset type: original mascot asset for PajakWajar, an Indonesian tax preparation website with a restrained editorial design, navy blue #17497d, ink #14202e, and cool white #f4f6f8. Primary request: create one charming original anthropomorphic tax worksheet character: a softly rounded upright ivory paper body with a folded top-right corner, two simple navy eyes, a warm small smile, very subtle pale blue cheeks, two small navy-blue arms and navy-blue feet. One hand raised in a friendly welcoming wave; the other comfortably at its side. A few understated light blue printed ledger lines on the lower body. Premium soft 3D illustration, matte ceramic/paper texture, gently rounded forms, sophisticated and approachable for adults, readable at 80px. Full-body front three-quarter view, centered square composition with clear padding around every limb. Soft studio lighting with minimal self-shadow. Genuinely transparent background with alpha, no backdrop or floor plane. Only one character, no text, no numbers, no letters, no logos, no watermark, no floating props, no money, no government insignia. This is a reusable web illustration rather than a screenshot.
```
