import { NextResponse } from 'next/server';
import { hasilBupotOcrSchema } from '@/lib/schemas';

/**
 * Route pembaca bukti potong.
 *
 * Route ini ada semata-mata agar kunci API tidak pernah dikirim ke peramban.
 * Foto diteruskan sekali jalan ke layanan OCR, tidak ditulis ke penyimpanan
 * mana pun, dan tidak ada catatan permintaan yang disimpan aplikasi ini.
 * Batas retensi di sisi penyedia layanan berada di luar kendali kami, dan hal
 * itu dinyatakan apa adanya di antarmuka.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MODEL_BAWAAN = 'gemini-3.6-flash';
const BATAS_BASE64 = 4 * 1024 * 1024;
const JENIS_DIIZINKAN = ['image/jpeg', 'image/png', 'image/webp'];

const INSTRUKSI = [
  'Anda membaca satu lembar bukti pemotongan Pajak Penghasilan Indonesia.',
  'Salin angka persis seperti tertulis. Jangan menghitung, menaksir, atau melengkapi angka yang tidak terbaca.',
  'Isi 0 untuk nilai uang yang tidak terbaca, dan string kosong untuk teks yang tidak terbaca.',
  'Kembalikan hanya JSON sesuai skema.'
].join(' ');

const SKEMA_JAWABAN = {
  type: 'object',
  properties: {
    nomorBuktiPotong: { type: 'string' },
    pemotong: { type: 'string' },
    tanggal: { type: 'string' },
    penghasilanBruto: { type: 'number' },
    pphDipotong: { type: 'number' }
  },
  required: ['nomorBuktiPotong', 'pemotong', 'tanggal', 'penghasilanBruto', 'pphDipotong']
};

type Permintaan = {
  persetujuan: boolean;
  mimeType: string;
  dataBase64: string;
};

function bacaPermintaan(muatan: unknown): Permintaan | null {
  if (!muatan || typeof muatan !== 'object') return null;
  const objek = muatan as Record<string, unknown>;
  if (typeof objek.mimeType !== 'string' || typeof objek.dataBase64 !== 'string') return null;
  return {
    persetujuan: objek.persetujuan === true,
    mimeType: objek.mimeType,
    dataBase64: objek.dataBase64
  };
}

function galat(pesan: string, status: number): NextResponse {
  return NextResponse.json({ pesan }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const kunci = process.env.GEMINI_API_KEY?.trim();
  if (!kunci) {
    return galat(
      'Pembaca otomatis belum diaktifkan di server ini. Ketik angka bukti potong secara manual.',
      503
    );
  }

  if (Number(request.headers.get('content-length') ?? 0) > BATAS_BASE64 + 1024) {
    return galat('Ukuran foto melebihi batas. Perkecil dulu fotonya.', 413);
  }
  // Batas berlaku pada stream juga, termasuk permintaan tanpa Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return galat('Permintaan tidak lengkap.', 400);
  const chunks: Uint8Array[] = [];
  let ukuran = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      ukuran += value.byteLength;
      if (ukuran > BATAS_BASE64 + 1024) {
        await reader.cancel();
        return galat('Ukuran foto melebihi batas. Perkecil dulu fotonya.', 413);
      }
      chunks.push(value);
    }
  } catch { return galat('Permintaan tidak terbaca. Kirim ulang fotonya.', 400); }
  let muatanPermintaan: unknown;
  try { muatanPermintaan = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return galat('Permintaan tidak lengkap. Kirim ulang foto bukti potong.', 400); }
  const permintaan = bacaPermintaan(muatanPermintaan);
  if (!permintaan) {
    return galat('Permintaan tidak lengkap. Kirim ulang foto bukti potong.', 400);
  }
  if (!permintaan.persetujuan) {
    return galat(
      'Foto tidak diproses karena persetujuan pengiriman belum diberikan. Gunakan input manual bila tidak setuju.',
      403
    );
  }
  if (!JENIS_DIIZINKAN.includes(permintaan.mimeType)) {
    return galat('Kirim foto berformat JPG, PNG, atau WebP.', 415);
  }
  if (permintaan.dataBase64.length > BATAS_BASE64) {
    return galat('Ukuran foto melebihi batas. Perkecil dulu fotonya.', 413);
  }
  if (!permintaan.dataBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(permintaan.dataBase64) || permintaan.dataBase64.length % 4 !== 0) {
    return galat('Data foto tidak valid. Pilih ulang berkas gambar.', 400);
  }
  if (Buffer.from(permintaan.dataBase64, 'base64').byteLength > 3 * 1024 * 1024) {
    return galat('Ukuran foto melebihi 3 MB. Perkecil dulu fotonya.', 413);
  }

  const konfigurasiModel = process.env.GEMINI_MODEL?.trim();
  // Migrasi konfigurasi deployment lama: 2.5 Flash menolak akun baru (404).
  const model = !konfigurasiModel || konfigurasiModel === 'gemini-2.5-flash'
    ? MODEL_BAWAAN : konfigurasiModel;
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) return galat('Konfigurasi pembaca belum valid. Gunakan input manual.', 503);

  let jawaban: Response;
  try {
    jawaban = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(45_000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': kunci },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: INSTRUKSI },
                { inlineData: { mimeType: permintaan.mimeType, data: permintaan.dataBase64 } }
              ]
            }
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: SKEMA_JAWABAN
          }
        })
      }
    );
  } catch {
    return galat(
      'Layanan pembaca tidak dapat dihubungi. Ketik angka bukti potong secara manual.',
      502
    );
  }

  if (!jawaban.ok) {
    return galat(
      'Layanan pembaca menolak permintaan. Ketik angka bukti potong secara manual.',
      502
    );
  }

  const muatan: unknown = await jawaban.json().catch(() => null);
  const teks = ambilTeks(muatan);
  if (!teks) {
    return galat('Isi bukti potong tidak terbaca. Ketik angkanya secara manual.', 422);
  }

  let terurai: unknown;
  try {
    terurai = JSON.parse(teks);
  } catch {
    return galat('Isi bukti potong tidak terbaca utuh. Ketik angkanya secara manual.', 422);
  }

  const tervalidasi = hasilBupotOcrSchema.safeParse(terurai);
  if (!tervalidasi.success) {
    return galat('Angka pada bukti potong tidak lengkap. Periksa dan lengkapi manual.', 422);
  }

  return NextResponse.json(tervalidasi.data);
}

/** Mengambil teks jawaban model tanpa memakai tipe `any`. */
function ambilTeks(muatan: unknown): string | null {
  if (!muatan || typeof muatan !== 'object') return null;
  const kandidat = (muatan as { candidates?: unknown }).candidates;
  if (!Array.isArray(kandidat) || kandidat.length === 0) return null;
  if (!kandidat[0] || typeof kandidat[0] !== 'object') return null;
  const isi = (kandidat[0] as { content?: unknown }).content;
  if (!isi || typeof isi !== 'object') return null;
  const parts = (isi as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return null;
  const teks = parts
    .map((bagian) => (bagian && typeof bagian === 'object' ? (bagian as { text?: unknown }).text : null))
    .filter((nilai): nilai is string => typeof nilai === 'string')
    .join('');
  return teks.length > 0 ? teks : null;
}
