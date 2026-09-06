# Waji, maskot PajakWajar

Waji adalah karakter lembar catatan dengan sudut terlipat, tangan dan kaki biru, serta ekspresi ramah. Nama berasal dari PajakWajar. Maskot mendampingi pengguna pada sambutan, proses, dan ringkasan siap. Gerakan berhasil menunjukkan proses selesai, bukan keputusan bahwa pengguna berhak memakai semua skema pajak.

- `waji-source.png`: gambar sumber dari tool imagegen bawaan, dibuat 6 September 2026.
- `../../public/mascot/waji.webp`: aset produksi transparan, 512 × 512, sekitar 29 KB. Dikonversi menggunakan Sharp dengan kualitas WebP 85; gambar sumber dipertahankan.
- `../../src/components/ui/Maskot.tsx`: komponen dekoratif dengan tiga suasana. Teks status tetap tersedia untuk pembaca layar.
- Gerakan sambutan dan keberhasilan hanya sekali; gerakan berulang hanya saat proses aktif. Seluruh gerakan maskot berhenti ketika `prefers-reduced-motion: reduce`.

Pembuatan memakai **tool imagegen bawaan**, bukan panggilan API dari aplikasi. Aplikasi hanya menyajikan aset statis ini; tidak memerlukan kunci API tambahan.

## Prompt final

```text
Use case: stylized-concept. Asset type: original mascot asset for PajakWajar, an Indonesian tax preparation website with a restrained editorial design, navy blue #17497d, ink #14202e, and cool white #f4f6f8. Primary request: create one charming original anthropomorphic tax worksheet character: a softly rounded upright ivory paper body with a folded top-right corner, two simple navy eyes, a warm small smile, very subtle pale blue cheeks, two small navy-blue arms and navy-blue feet. One hand raised in a friendly welcoming wave; the other comfortably at its side. A few understated light blue printed ledger lines on the lower body. Premium soft 3D illustration, matte ceramic/paper texture, gently rounded forms, sophisticated and approachable for adults, readable at 80px. Full-body front three-quarter view, centered square composition with clear padding around every limb. Soft studio lighting with minimal self-shadow. Genuinely transparent background with alpha, no backdrop or floor plane. Only one character, no text, no numbers, no letters, no logos, no watermark, no floating props, no money, no government insignia. This is a reusable web illustration rather than a screenshot.
```
