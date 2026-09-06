import { hasilBupotOcrSchema } from '@/lib/schemas';
import type { HasilBupotOcr } from '@/lib/schemas';
import type { KreditPajakItem } from '@/types/pajak';

/**
 * Pembacaan bukti potong.
 *
 * Ini satu-satunya bagian PajakWajar yang memakai model bahasa, dan perannya
 * dibatasi pada mengubah gambar menjadi angka terstruktur. Tidak ada keputusan
 * kelayakan maupun perhitungan pajak yang lahir dari sini.
 *
 * Tiga syarat yang tidak boleh dilanggar:
 * 1. Foto hanya dikirim setelah persetujuan eksplisit pengguna.
 * 2. Mode ketik manual selalu tersedia dan tidak bergantung pada layanan ini.
 * 3. Hasil bacaan wajib ditinjau pengguna sebelum dipakai.
 */

export const BATAS_UKURAN_BERKAS = 3 * 1024 * 1024;

export const JENIS_BERKAS_DIIZINKAN = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class GalatPersetujuan extends Error {
  constructor() {
    super(
      'Foto bukti potong belum boleh dikirim. Centang persetujuan terlebih dahulu, atau ketik angkanya secara manual.'
    );
    this.name = 'GalatPersetujuan';
  }
}

export class GalatBerkas extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = 'GalatBerkas';
  }
}

export class GalatLayananOcr extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = 'GalatLayananOcr';
  }
}

/** Memeriksa berkas sebelum apa pun meninggalkan perangkat pengguna. */
export function periksaBerkasBupot(file: File): void {
  if (file.size === 0) throw new GalatBerkas('Berkas foto kosong. Pilih gambar yang lain.');
  const jenisDiizinkan: readonly string[] = JENIS_BERKAS_DIIZINKAN;
  if (!jenisDiizinkan.includes(file.type)) {
    throw new GalatBerkas('Kirim foto berformat JPG, PNG, atau WebP.');
  }
  if (file.size > BATAS_UKURAN_BERKAS) {
    throw new GalatBerkas('Ukuran foto melebihi 3 MB. Perkecil dulu fotonya.');
  }
}

async function keBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let biner = '';
  for (let i = 0; i < bytes.length; i += 1) biner += String.fromCharCode(bytes[i]);
  return btoa(biner);
}

/**
 * Mengirim foto bukti potong ke layanan OCR melalui route server sendiri,
 * supaya kunci API tidak pernah sampai ke peramban.
 *
 * @param setuju Persetujuan eksplisit pengguna untuk mengirim foto keluar perangkat.
 * @throws {GalatPersetujuan} bila persetujuan belum diberikan.
 */
export async function bacaBupotDenganPersetujuan(
  file: File,
  setuju: boolean,
  signal?: AbortSignal
): Promise<HasilBupotOcr> {
  if (!setuju) throw new GalatPersetujuan();
  periksaBerkasBupot(file);

  const respons = await fetch('/api/ocr-bupot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      persetujuan: true,
      mimeType: file.type,
      dataBase64: await keBase64(file)
    }),
    signal
  });

  const muatan: unknown = await respons.json().catch(() => null);

  if (!respons.ok) {
    const pesan =
      muatan && typeof muatan === 'object' && 'pesan' in muatan && typeof muatan.pesan === 'string'
        ? muatan.pesan
        : 'Layanan pembaca bukti potong sedang tidak dapat dihubungi. Ketik angkanya secara manual.';
    throw new GalatLayananOcr(pesan);
  }

  const terbaca = hasilBupotOcrSchema.safeParse(muatan);
  if (!terbaca.success) {
    throw new GalatLayananOcr(
      'Angka pada foto tidak terbaca utuh. Periksa hasilnya atau ketik manual.'
    );
  }
  return terbaca.data;
}

/** Mengubah hasil bacaan menjadi item kredit pajak yang siap ditinjau pengguna. */
export function keKreditPajak(hasil: HasilBupotOcr, sumber: 'MANUAL' | 'OCR'): KreditPajakItem {
  return {
    nomorBuktiPotong: hasil.nomorBuktiPotong,
    pemotong: hasil.pemotong,
    penghasilanBruto: hasil.penghasilanBruto,
    pphDipotong: hasil.pphDipotong,
    sumber
  };
}
