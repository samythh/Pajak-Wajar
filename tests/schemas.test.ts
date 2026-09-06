import { describe, expect, it } from 'vitest';
import { inputAuditPajakSchema, profilWajibPajakSchema } from '../src/lib/schemas';

const profil = {
  tahunPajak: 2026,
  kluKode: '90002',
  wilayah: 'kelompok1',
  statusPtkp: 'TK/0',
  bentukKegiatan: 'PEKERJAAN_BEBAS',
  statusPerpajakanPasangan: 'TIDAK_ADA_PASANGAN',
  punyaLebihDariSatuKegiatan: false,
  omzetPribadiTahunPajak: 120_000_000,
  omzetPribadiThnSebelumnya: 90_000_000,
  omzetPasanganThnSebelumnya: 0,
  omzetSeluruhPerseroanPeroranganThnSebelumnya: 0,
  sudahMemberitahukanNppn: 'tidak_yakin',
  pernahPilihTarifUmum: false,
  jugaPegawaiTetap: false,
  pernahMelewatiAmbang: false
};

describe('validasi profil wajib pajak', () => {
  it('menerima profil dengan jawaban tidak yakin dan biaya usaha yang dikosongkan', () => {
    expect(profilWajibPajakSchema.safeParse(profil).success).toBe(true);
  });

  it.each([
    'omzetPribadiTahunPajak',
    'omzetPribadiThnSebelumnya',
    'omzetPasanganThnSebelumnya',
    'omzetSeluruhPerseroanPeroranganThnSebelumnya'
  ])('menolak nilai negatif pada %s', (field) => {
    expect(profilWajibPajakSchema.safeParse({ ...profil, [field]: -1 }).success).toBe(false);
  });

  it('menolak nominal berbentuk teks dan NaN', () => {
    for (const omzetPribadiTahunPajak of ['120000000', NaN, Infinity]) {
      expect(
        profilWajibPajakSchema.safeParse({ ...profil, omzetPribadiTahunPajak }).success
      ).toBe(false);
    }
  });

  it('menolak tahun di luar cakupan formulir', () => {
    expect(profilWajibPajakSchema.safeParse({ ...profil, tahunPajak: 2024 }).success).toBe(false);
  });

  it('menolak profil tanpa pilihan pekerjaan', () => {
    expect(profilWajibPajakSchema.safeParse({ ...profil, kluKode: '' }).success).toBe(false);
  });

  it('menolak status keluarga di luar kontrak', () => {
    expect(profilWajibPajakSchema.safeParse({ ...profil, statusPtkp: 'TK/4' }).success).toBe(false);
  });

  it('menolak kelompok wilayah yang tidak dikenal', () => {
    expect(profilWajibPajakSchema.safeParse({ ...profil, wilayah: 'kelompok4' }).success).toBe(
      false
    );
  });

  it('menolak jawaban kepatuhan bebas yang tidak dapat dievaluasi', () => {
    expect(
      profilWajibPajakSchema.safeParse({ ...profil, sudahMemberitahukanNppn: 'mungkin' }).success
    ).toBe(false);
  });

  it('membedakan biaya usaha yang dikosongkan dari biaya usaha Rp0', () => {
    const kosong = profilWajibPajakSchema.parse(profil);
    const nol = profilWajibPajakSchema.parse({ ...profil, biayaOperasionalRiil: 0 });
    expect(kosong.biayaOperasionalRiil).toBeUndefined();
    expect(nol.biayaOperasionalRiil).toBe(0);
  });
});

describe('validasi masukan audit', () => {
  it('menerima daftar bukti potong kosong', () => {
    expect(inputAuditPajakSchema.safeParse({ profil, kreditPajak: [] }).success).toBe(true);
  });

  it('menolak bukti potong dengan sumber di luar kontrak', () => {
    const hasil = inputAuditPajakSchema.safeParse({
      profil,
      kreditPajak: [
        {
          nomorBuktiPotong: 'BP-1',
          pemotong: 'PT Contoh',
          penghasilanBruto: 10_000_000,
          pphDipotong: 200_000,
          sumber: 'TEBAKAN'
        }
      ]
    });
    expect(hasil.success).toBe(false);
  });

  it('menolak pemotongan pajak bernilai negatif', () => {
    const hasil = inputAuditPajakSchema.safeParse({
      profil,
      kreditPajak: [
        {
          nomorBuktiPotong: 'BP-1',
          pemotong: 'PT Contoh',
          penghasilanBruto: 10_000_000,
          pphDipotong: -1,
          sumber: 'MANUAL'
        }
      ]
    });
    expect(hasil.success).toBe(false);
  });
});
