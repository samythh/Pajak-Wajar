import { describe, expect, it } from 'vitest';
import { auditPajakMandiri } from '../src/lib/index';
import { hitungNppn, hitungTarifProgresifBerlapis } from '../src/lib/calculator';
import { basisAturan } from '../src/lib/regulasi';
import { profilPedagang } from '../src/mock/hasilKelayakan';
import type { ProfilWajibPajak } from '../src/types/pajak';

const lapisan = basisAturan.parameterPajak.tarifProgresif.lapisan;
const audit = (patch: Partial<ProfilWajibPajak> = {}) => auditPajakMandiri({ profil: { ...profilPedagang, ...patch }, kreditPajak: [] });

describe('regresi audit kesiapan', () => {
  it('membulatkan PKP ke bawah sebelum melewati lapisan berikutnya', () => {
    expect(hitungTarifProgresifBerlapis(60_000_999, lapisan).pajak).toBe(3_000_000);
    expect(hitungTarifProgresifBerlapis(60_001_000, lapisan).pajak).toBe(3_000_150);
  });
  it('tidak membulatkan neto pecahan naik sebelum membulatkan PKP', () => {
    const r = hitungNppn({ omzetPribadi: 228_001_999, persenNorma: 50, ptkp: 54_000_000, kreditBupot: 0, lapisan });
    expect(r.pkp).toBe(60_000_000);
    expect(r.pajakTerutang).toBe(3_000_000);
  });
  it('menggabungkan gaji dan usaha dengan PTKP sekali saja', () => {
    const r = hitungNppn({ omzetPribadi: 120_000_000, persenNorma: 50, penghasilanNetoPegawai: 120_000_000, ptkp: 54_000_000, kreditBupot: 5_000_000, lapisan });
    expect(r.pkp).toBe(126_000_000);
    expect(r.pajakTerutang).toBe(7_900_000);
  });
  it('menyimpan selisih kredit berlebih agar tidak tampak sebagai nihil', () => {
    const r = hitungNppn({ omzetPribadi: 120_000_000, persenNorma: 50, ptkp: 54_000_000, kreditBupot: 1_000_000, lapisan });
    expect(r.pajakTerutang).toBe(0);
    expect(r.kelebihanKredit).toBe(700_000);
  });
  it('menunda nominal gabungan bila neto gaji belum diisi', () => {
    const r = audit({ jugaPegawaiTetap: true });
    expect(r.skema.filter(s => s.id !== 'PPH_FINAL_05').every(s => s.statusKalkulasi === 'BELUM_TERSEDIA')).toBe(true);
    expect(r.rekomendasiHemat).toBeUndefined();
  });
  it.each(['GABUNG', 'PISAH_HARTA', 'PISAH_KEWAJIBAN', 'TIDAK_YAKIN'] as const)('menunda pajak keluarga %s ketika data neto pasangan belum tersedia', statusPerpajakanPasangan => {
    const r = audit({ statusPerpajakanPasangan });
    expect(r.skema.filter(s => s.id !== 'PPH_FINAL_05').every(s => s.statusKalkulasi === 'BELUM_TERSEDIA')).toBe(true);
  });
  it('menunda nominal ketika PTKP kawin bertentangan dengan jawaban pasangan', () => {
    expect(audit({ statusPtkp: 'K/0' }).skema.find(s => s.id === 'TARIF_UMUM')?.statusKalkulasi).toBe('BELUM_TERSEDIA');
  });
  it('tidak menerapkan vonis final 2026 ke tahun 2025', () => {
    const r = audit({ tahunPajak: 2025 }).skema[0];
    expect(r.statusKelayakan).toBe('PERLU_DIPASTIKAN');
    expect(r.statusKalkulasi).not.toBe('TERSEDIA');
  });
  it('menunda hak final ketika riwayat ambang belum pasti', () => {
    expect(audit({ pernahMelewatiAmbang: undefined }).skema[0].statusKelayakan).toBe('PERLU_DIPASTIKAN');
  });
  it('tidak menyamakan seluruh kegiatan dengan satu kegiatan yang dipilih', () => {
    expect(audit({ punyaLebihDariSatuKegiatan: true }).skema[0].statusKelayakan).toBe('PERLU_DIPASTIKAN');
  });
  it('tidak merekomendasikan final bruto melawan sisa pajak sesudah kredit', () => {
    const r = auditPajakMandiri({ profil: profilPedagang, kreditPajak: [{ nomorBuktiPotong: 'BP1', pemotong: 'Contoh', penghasilanBruto: 100_000_000, pphDipotong: 10_000_000, sumber: 'MANUAL' }] });
    expect(r.rekomendasiHemat).toBeUndefined();
  });
  it('menolak nomor bukti potong ganda walaupun penulisannya berbeda', () => {
    const item = { nomorBuktiPotong: 'BP-1', pemotong: 'Contoh', penghasilanBruto: 100_000_000, pphDipotong: 10_000_000, sumber: 'MANUAL' as const };
    expect(() => auditPajakMandiri({ profil: profilPedagang, kreditPajak: [item, { ...item, nomorBuktiPotong: ' bp-1 ' }] })).toThrow(/sudah ditambahkan/);
  });
});
