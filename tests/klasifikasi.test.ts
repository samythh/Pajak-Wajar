import { describe, expect, it } from 'vitest';
import { basisAturan, cariKlu } from '../src/lib/regulasi';
import { auditPajakMandiri } from '../src/lib/index';
import { profilKreator } from '../src/mock/hasilKelayakan';

describe('pencocokan KLU Norma ke KBLI 2020', () => {
  it('seluruh 22 kegiatan mempunyai padanan, sumber BPS dan halaman yang dapat ditelusuri', () => {
    expect(basisAturan.klu).toHaveLength(22);
    for (const klu of basisAturan.klu) {
      const p = klu.pemetaanKbli2020;
      expect(new URL(p.sumberKbli).hostname).toBe('ppid.bps.go.id');
      expect(p.halamanNorma).toBeGreaterThan(0);
      expect(p.halamanNorma).toBeLessThanOrEqual(380);
      expect(p.padanan.length).toBeGreaterThan(0);
      expect(new Set(p.padanan.map((item) => item.kode)).size).toBe(p.padanan.length);
      expect(p.hubungan).toBe(p.padanan.length > 1 ? 'BEBERAPA_PADANAN' : 'SATU_PADANAN');
      for (const item of p.padanan) {
        expect(item.kode).toMatch(/^\d{5}$/);
        expect(item.halamanPdf).toBeGreaterThan(235);
        expect(item.halamanPdf).toBeLessThanOrEqual(838);
      }
    }
  });

  // Kode fakta pada uraian KBLI 2020 dan tabel perubahan BPS; bukan nomor
  // yang dibentuk dengan menambahkan/mengurangi digit dari kode lama.
  it.each([
    ['90002', ['90021', '90022', '90023', '90024', '90029']],
    ['90005', ['90025']],
    ['62010', ['62011', '62012', '62013', '62014', '62015', '62019']],
    ['69100', ['69101', '69102', '69103', '69104', '69109']],
    ['69200', ['69201', '69202']],
    ['71100', ['71101', '71102']],
    ['70209', ['70204', '70209']],
    ['56101', ['56101', '56102']]
  ])('menjaga padanan %s tanpa mengganti kode lampiran Norma', (kode, padanan) => {
    const klu = cariKlu(kode as string);
    expect(klu?.kluKode).toBe(kode);
    expect(klu?.pemetaanKbli2020.padanan.map((p) => p.kode)).toEqual(padanan);
  });

  it('tidak memasarkan kegiatan yang berbeda sebagai alias satu kode', () => {
    const tidakSesuai: Record<string, string[]> = {
      '47111': ['warung kelontong', 'toko sembako', 'toko kelontong'],
      '56101': ['kafe', 'katering', 'kedai kopi', 'warung makan'],
      '85499': ['bimbingan belajar', 'guru les', 'moderator'],
      '86202': ['dokter gigi spesialis'],
      '14111': ['penjahit', 'tailor'],
      '90002': ['affiliator'],
      '74201': ['video editor', 'cinematographer']
    };
    for (const [kode, alias] of Object.entries(tidakSesuai)) {
      for (const item of alias) expect(cariKlu(kode)?.alias).not.toContain(item);
    }
  });

  it.each(['BELUM_DIDUKUNG', '90025', '62019'])('tidak menganggap %s otomatis memiliki Norma terverifikasi', (kluKode) => {
    const hasil = auditPajakMandiri({ profil: { ...profilKreator, kluKode }, kreditPajak: [] });
    for (const id of ['PPH_FINAL_05', 'NPPN']) {
      const skema = hasil.skema.find((s) => s.id === id);
      expect(skema?.statusKelayakan).toBe('PERLU_DIPASTIKAN');
      expect(skema?.statusKalkulasi).not.toBe('TERSEDIA');
      expect(skema).not.toHaveProperty('pajakTerutang');
    }
  });
});
