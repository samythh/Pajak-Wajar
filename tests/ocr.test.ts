import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../src/app/api/ocr-bupot/route';
import {
  GalatBerkas,
  GalatLayananOcr,
  GalatPersetujuan,
  bacaBupotDenganPersetujuan,
  keKreditPajak,
  periksaBerkasBupot
} from '../src/lib/ocr';

/**
 * Pembacaan bukti potong adalah satu-satunya bagian yang memakai model bahasa.
 * Uji di berkas ini menjaga tiga hal: persetujuan tidak pernah dilewati, jalur
 * manual tidak pernah bergantung pada layanan luar, dan jawaban model selalu
 * divalidasi ulang sebelum dipakai.
 */

const GAMBAR_1x1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function berkas(tipe = 'image/png', ukuran = 128): File {
  return new File([new Uint8Array(ukuran)], 'bupot.png', { type: tipe });
}

function permintaan(muatan: unknown): Request {
  return new Request('http://localhost/api/ocr-bupot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(muatan)
  });
}

function jawabanGemini(isi: unknown): Response {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(isi) }] } }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

const BUPOT_BENAR = {
  nomorBuktiPotong: '1.2-08.26-0000123',
  pemotong: 'PT Media Kreatif Nusantara',
  tanggal: '2026-08-14',
  penghasilanBruto: 120_000_000,
  pphDipotong: 6_000_000
};

// ---------------------------------------------------------------------------
// Gerbang di sisi peramban
// ---------------------------------------------------------------------------

describe('gerbang persetujuan di klien', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('menolak mengirim foto tanpa persetujuan dan tidak menyentuh jaringan', async () => {
    const fetchPalsu = vi.fn();
    vi.stubGlobal('fetch', fetchPalsu);

    await expect(bacaBupotDenganPersetujuan(berkas(), false)).rejects.toBeInstanceOf(
      GalatPersetujuan
    );
    expect(fetchPalsu).not.toHaveBeenCalled();
  });

  it('menolak jenis berkas di luar JPG, PNG, dan WebP', () => {
    expect(() => periksaBerkasBupot(berkas('application/pdf'))).toThrowError(GalatBerkas);
    expect(() => periksaBerkasBupot(berkas('image/gif'))).toThrowError(/JPG, PNG, atau WebP/);
  });

  it('menolak berkas yang melebihi 3 MB', () => {
    expect(() => periksaBerkasBupot(berkas('image/png', 5 * 1024 * 1024))).toThrowError(
      /melebihi 3 MB/
    );
  });

  it('menerima berkas yang sah', () => {
    expect(() => periksaBerkasBupot(berkas())).not.toThrow();
  });

  it('meneruskan persetujuan ke server dan mengembalikan hasil tervalidasi', async () => {
    const fetchPalsu = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(BUPOT_BENAR), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchPalsu);

    const hasil = await bacaBupotDenganPersetujuan(berkas(), true);
    expect(hasil).toEqual(BUPOT_BENAR);

    const [url, opsi] = fetchPalsu.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/ocr-bupot');
    const dikirim = JSON.parse(String(opsi.body)) as Record<string, unknown>;
    expect(dikirim.persetujuan).toBe(true);
    expect(dikirim.mimeType).toBe('image/png');
    expect(typeof dikirim.dataBase64).toBe('string');
  });

  it('menolak jawaban server yang tidak sesuai bentuk bukti potong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ pemotong: 'PT Contoh', pphDipotong: 'enam juta' }), {
          status: 200
        })
      )
    );
    await expect(bacaBupotDenganPersetujuan(berkas(), true)).rejects.toBeInstanceOf(
      GalatLayananOcr
    );
  });

  it('meneruskan pesan galat server apa adanya agar pengguna tahu harus mengetik manual', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ pesan: 'Ketik angka bukti potong secara manual.' }), {
          status: 503
        })
      )
    );
    await expect(bacaBupotDenganPersetujuan(berkas(), true)).rejects.toThrowError(/manual/);
  });

  it('memetakan hasil bacaan menjadi item kredit pajak bertanda sumbernya', () => {
    const item = keKreditPajak(BUPOT_BENAR, 'OCR');
    expect(item.sumber).toBe('OCR');
    expect(item.pphDipotong).toBe(6_000_000);
    expect(keKreditPajak(BUPOT_BENAR, 'MANUAL').sumber).toBe('MANUAL');
  });
});

// ---------------------------------------------------------------------------
// Route server
// ---------------------------------------------------------------------------

describe('route /api/ocr-bupot', () => {
  const kunciAsli = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'kunci-uji';
  });

  afterEach(() => {
    if (kunciAsli === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = kunciAsli;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each(['', 'gemini-2.5-flash'])('konfigurasi lama atau kosong %s memakai model yang tersedia', async (model) => {
    vi.stubEnv('GEMINI_MODEL', model);
    const fetchPalsu = vi.fn().mockResolvedValue(jawabanGemini(BUPOT_BENAR));
    vi.stubGlobal('fetch', fetchPalsu);
    const res = await POST(permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: GAMBAR_1x1 }));
    expect(res.status).toBe(200);
    expect(fetchPalsu.mock.calls[0][0]).toContain('/gemini-3.6-flash:generateContent');
    expect(fetchPalsu.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('menolak base64 rusak sebelum menghubungi layanan', async () => {
    const fetchPalsu = vi.fn();
    vi.stubGlobal('fetch', fetchPalsu);
    const res = await POST(permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: 'bukan gambar!' }));
    expect(res.status).toBe(400);
    expect(fetchPalsu).not.toHaveBeenCalled();
  });

  it('jawaban kandidat null menghasilkan pesan terbaca, bukan crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [null] }))));
    const res = await POST(permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: GAMBAR_1x1 }));
    expect(res.status).toBe(422);
  });

  it('menolak file kosong di perangkat pengguna', () => {
    expect(() => periksaBerkasBupot(berkas('image/png', 0))).toThrow(/kosong/);
  });

  it('menjawab 503 dan mengarahkan ke input manual bila kunci API belum diisi', async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchPalsu = vi.fn();
    vi.stubGlobal('fetch', fetchPalsu);

    const res = await POST(permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: GAMBAR_1x1 }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { pesan: string }).pesan).toMatch(/manual/i);
    expect(fetchPalsu).not.toHaveBeenCalled();
  });

  it('menolak permintaan tanpa persetujuan dan tidak memanggil layanan OCR', async () => {
    const fetchPalsu = vi.fn();
    vi.stubGlobal('fetch', fetchPalsu);

    const res = await POST(permintaan({ persetujuan: false, mimeType: 'image/png', dataBase64: GAMBAR_1x1 }));
    expect(res.status).toBe(403);
    expect(fetchPalsu).not.toHaveBeenCalled();
  });

  it('menolak jenis berkas yang tidak diizinkan', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const res = await POST(
      permintaan({ persetujuan: true, mimeType: 'application/pdf', dataBase64: GAMBAR_1x1 })
    );
    expect(res.status).toBe(415);
  });

  it('menolak muatan yang terlalu besar', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const res = await POST(
      permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: 'A'.repeat(7 * 1024 * 1024) })
    );
    expect(res.status).toBe(413);
  });

  it('menolak permintaan yang tidak lengkap', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const res = await POST(permintaan({ persetujuan: true }));
    expect(res.status).toBe(400);
  });

  it('memanggil Gemini dengan temperature 0 dan skema jawaban terstruktur', async () => {
    const fetchPalsu = vi.fn().mockResolvedValue(jawabanGemini(BUPOT_BENAR));
    vi.stubGlobal('fetch', fetchPalsu);

    const res = await POST(permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: GAMBAR_1x1 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(BUPOT_BENAR);

    const [url, opsi] = fetchPalsu.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect((opsi.headers as Record<string, string>)['x-goog-api-key']).toBe('kunci-uji');
    const badan = JSON.parse(String(opsi.body)) as {
      generationConfig: { temperature: number; responseMimeType: string; responseSchema: unknown };
    };
    expect(badan.generationConfig.temperature).toBe(0);
    expect(badan.generationConfig.responseMimeType).toBe('application/json');
    expect(badan.generationConfig.responseSchema).toBeTruthy();
  });

  it('menolak jawaban model yang bukan JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: 'maaf, tidak terbaca' }] } }] }),
          { status: 200 }
        )
      )
    );
    const res = await POST(permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: GAMBAR_1x1 }));
    expect(res.status).toBe(422);
  });

  it('menolak jawaban model yang bentuknya tidak sesuai kontrak', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jawabanGemini({ pemotong: 'PT Contoh' })));
    const res = await POST(permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: GAMBAR_1x1 }));
    expect(res.status).toBe(422);
  });

  it('menolak nominal negatif yang dikarang model', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jawabanGemini({ ...BUPOT_BENAR, pphDipotong: -1 }))
    );
    const res = await POST(permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: GAMBAR_1x1 }));
    expect(res.status).toBe(422);
  });

  it('menjawab 502 bila layanan OCR tidak dapat dihubungi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('jaringan putus')));
    const res = await POST(permintaan({ persetujuan: true, mimeType: 'image/png', dataBase64: GAMBAR_1x1 }));
    expect(res.status).toBe(502);
    expect(((await res.json()) as { pesan: string }).pesan).toMatch(/manual/i);
  });
});

// ---------------------------------------------------------------------------
// Uji terhadap layanan Gemini sungguhan
// ---------------------------------------------------------------------------

/**
 * Blok ini hanya berjalan bila `GEMINI_API_KEY` tersedia, supaya pengujian
 * rutin tidak pernah mengirim gambar keluar dan tidak menimbulkan biaya.
 * Isi kuncinya di `.env.local` (dimuat oleh `tests/setup-env.ts`), lalu:
 *
 *   npm run test:ocr
 *
 * Gambar yang dikirim adalah `tests/fixtures/contoh-bupot.png`, sebuah lembar
 * latihan berisi data karangan yang diberi cap CONTOH.
 */
const adaKunci = Boolean(process.env.GEMINI_API_KEY) && process.env.npm_lifecycle_event === 'test:ocr';

describe.skipIf(!adaKunci)('pembacaan nyata oleh layanan Gemini', () => {
  it(
    'membaca nomor, pemotong, dan nominal dari lembar contoh',
    async () => {
      const berkasContoh = fileURLToPath(new URL('./fixtures/contoh-bupot.png', import.meta.url));
      const res = await POST(
        permintaan({
          persetujuan: true,
          mimeType: 'image/png',
          dataBase64: readFileSync(berkasContoh).toString('base64')
        })
      );

      expect(res.status).toBe(200);
      const hasil = (await res.json()) as typeof BUPOT_BENAR;
      console.info('hasil bacaan OCR:', hasil);

      expect(hasil.penghasilanBruto).toBe(120_000_000);
      expect(hasil.pphDipotong).toBe(6_000_000);
      expect(hasil.nomorBuktiPotong.replace(/\s/g, '')).toContain('0000123');
      expect(hasil.pemotong.toUpperCase()).toContain('MEDIA KREATIF');
    },
    60_000
  );
});
