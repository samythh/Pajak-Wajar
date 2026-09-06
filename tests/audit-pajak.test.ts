import { describe, expect, it } from 'vitest';
import { GalatMasukan, auditPajakMandiri } from '../src/lib/index';
import type {
  HasilAuditPajak,
  HasilSkema,
  IdSkema,
  InputAuditPajak,
  ProfilWajibPajak
} from '../src/types/pajak';

const profilDagang: ProfilWajibPajak = {
  tahunPajak: 2026,
  kluKode: '47919',
  wilayah: 'kelompok1',
  statusPtkp: 'TK/0',
  bentukKegiatan: 'USAHA_DAGANG',
  statusPerpajakanPasangan: 'TIDAK_ADA_PASANGAN',
  punyaLebihDariSatuKegiatan: false,
  omzetPribadiTahunPajak: 900_000_000,
  biayaOperasionalRiil: 620_000_000,
  omzetPribadiThnSebelumnya: 780_000_000,
  omzetPasanganThnSebelumnya: 0,
  omzetSeluruhPerseroanPeroranganThnSebelumnya: 0,
  sudahMemberitahukanNppn: true,
  pernahPilihTarifUmum: false,
  jugaPegawaiTetap: false,
  pernahMelewatiAmbang: false
};

const input = (profil: ProfilWajibPajak, kreditPajak: InputAuditPajak['kreditPajak'] = []) => ({
  profil,
  kreditPajak
});

/** Mengambil satu skema sambil mempertahankan penyempitan tipe menurut `id`. */
function skemaDari<T extends IdSkema>(hasil: HasilAuditPajak, id: T): Extract<HasilSkema, { id: T }> {
  const ditemukan = hasil.skema.find(
    (item): item is Extract<HasilSkema, { id: T }> => item.id === id
  );
  if (!ditemukan) throw new Error(`Skema ${id} tidak ada`);
  return ditemukan;
}

describe('validasi masukan', () => {
  it('menolak omzet negatif dengan pesan yang menyebut kolomnya', () => {
    expect(() =>
      auditPajakMandiri(input({ ...profilDagang, omzetPribadiTahunPajak: -1 }))
    ).toThrowError(GalatMasukan);
  });

  it('menolak profil tanpa pilihan pekerjaan', () => {
    expect(() => auditPajakMandiri(input({ ...profilDagang, kluKode: '' }))).toThrowError(
      /Pilih profesi/
    );
  });

  it('menerima kredit pajak terpisah dari profil', () => {
    const hasil = auditPajakMandiri(
      input(profilDagang, [
        {
          nomorBuktiPotong: 'BP-1',
          pemotong: 'PT Contoh',
          penghasilanBruto: 50_000_000,
          pphDipotong: 1_000_000,
          sumber: 'MANUAL'
        }
      ])
    );
    expect(hasil.totalKreditBupot).toBe(1_000_000);
  });
});

describe('konsistensi status kalkulasi', () => {
  it('TERSEDIA selalu membawa nominal dan rincian sesuai skemanya', () => {
    const hasil = auditPajakMandiri(input(profilDagang));
    const final = skemaDari(hasil, 'PPH_FINAL_05');
    expect(final.statusKelayakan).toBe('BOLEH');
    expect(final.statusKalkulasi).toBe('TERSEDIA');
    if (final.statusKalkulasi !== 'TERSEDIA') throw new Error('status tidak sesuai');
    expect(final.rincianKalkulasi.skema).toBe('PPH_FINAL_05');
    expect(final.rincianKalkulasi.dasarPengenaan).toBe(400_000_000);
    expect(final.pajakTerutang).toBe(2_000_000);
  });

  it('status selain TERSEDIA tidak pernah membawa nominal', () => {
    const hasil = auditPajakMandiri(
      input({ ...profilDagang, kluKode: '90002', bentukKegiatan: 'PEKERJAAN_BEBAS' })
    );
    const final = skemaDari(hasil, 'PPH_FINAL_05');
    expect(final.statusKelayakan).toBe('TIDAK_BOLEH');
    expect(final.statusKalkulasi).toBe('TIDAK_RELEVAN');
    expect('pajakTerutang' in final).toBe(false);
    expect('rincianKalkulasi' in final).toBe(false);
  });

  it('kalkulasi yang diblokir tidak menurunkan status kelayakan', () => {
    const hasil = auditPajakMandiri(
      input({ ...profilDagang, punyaLebihDariSatuKegiatan: true })
    );
    const nppn = skemaDari(hasil, 'NPPN');
    expect(nppn.statusKelayakan).toBe('BOLEH');
    expect(nppn.statusKalkulasi).toBe('BELUM_TERSEDIA');
    expect('pajakTerutang' in nppn).toBe(false);
  });
});

describe('batasan kalkulasi', () => {
  it('multi kegiatan memblokir NPPN agar omzet gabungan tidak dikalikan satu norma', () => {
    for (const jawaban of [true, 'tidak_yakin'] as const) {
      const hasil = auditPajakMandiri(
        input({ ...profilDagang, punyaLebihDariSatuKegiatan: jawaban })
      );
      expect(skemaDari(hasil, 'NPPN').statusKalkulasi).toBe('BELUM_TERSEDIA');
    }
  });

  it('tarif umum tanpa biaya usaha berstatus BELUM_TERSEDIA, bukan memakai Rp0', () => {
    const hasil = auditPajakMandiri(
      input({ ...profilDagang, biayaOperasionalRiil: undefined })
    );
    const tarifUmum = skemaDari(hasil, 'TARIF_UMUM');
    expect(tarifUmum.statusKelayakan).toBe('BOLEH');
    expect(tarifUmum.statusKalkulasi).toBe('BELUM_TERSEDIA');
  });

  it('biaya usaha Rp0 yang diisi sengaja tetap dihitung', () => {
    const hasil = auditPajakMandiri(input({ ...profilDagang, biayaOperasionalRiil: 0 }));
    expect(skemaDari(hasil, 'TARIF_UMUM').statusKalkulasi).toBe('TERSEDIA');
  });
});

describe('rekomendasi dan keluaran akhir', () => {
  it('memilih skema termurah di antara yang terhitung', () => {
    const hasil = auditPajakMandiri(input(profilDagang));
    const terhitung = hasil.skema.filter((skema) => skema.statusKalkulasi === 'TERSEDIA');
    expect(terhitung.length).toBeGreaterThan(1);
    expect(hasil.rekomendasiHemat?.id).toBe('PPH_FINAL_05');
    expect(hasil.rekomendasiHemat?.pajakTerutang).toBe(2_000_000);
  });

  it('tidak memberi rekomendasi bila tidak ada skema yang terhitung', () => {
    const hasil = auditPajakMandiri(
      input({
        ...profilDagang,
        kluKode: '90002',
        bentukKegiatan: 'PEKERJAAN_BEBAS',
        sudahMemberitahukanNppn: 'tidak_yakin',
        biayaOperasionalRiil: undefined
      })
    );
    expect(hasil.rekomendasiHemat).toBeUndefined();
  });

  it('menyertakan versi regulasi dan tanggal audit', () => {
    const hasil = auditPajakMandiri(input(profilDagang));
    expect(hasil.versiRegulasi).toBe('PP-20-2026');
    expect(hasil.tanggalAudit).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('kredit bukti potong mengurangi tarif umum, bukan PPh Final', () => {
    const hasil = auditPajakMandiri(
      input(profilDagang, [
        {
          nomorBuktiPotong: 'BP-2',
          pemotong: 'PT Contoh',
          penghasilanBruto: 100_000_000,
          pphDipotong: 2_000_000,
          sumber: 'MANUAL'
        }
      ])
    );
    const tarifUmum = skemaDari(hasil, 'TARIF_UMUM');
    const final = skemaDari(hasil, 'PPH_FINAL_05');
    if (tarifUmum.statusKalkulasi !== 'TERSEDIA' || final.statusKalkulasi !== 'TERSEDIA') {
      throw new Error('kedua skema seharusnya terhitung');
    }
    expect(tarifUmum.rincianKalkulasi.kreditBupot).toBe(2_000_000);
    expect(final.pajakTerutang).toBe(2_000_000);
  });
});
