import { describe, expect, it } from 'vitest';
import { agregasiPrioritas, hitungOmzetKonsolidasi, periksaKelayakan } from '../src/lib/eligibility';
import type { IdSkema, ProfilWajibPajak, StatusKelayakan } from '../src/types/pajak';

/**
 * Kasus uji saringan kelayakan. Setiap kasus mewakili satu keputusan hukum
 * yang harus dapat dijelaskan pemiliknya di depan juri.
 */

const dasar: ProfilWajibPajak = {
  tahunPajak: 2026,
  kluKode: '47919',
  wilayah: 'kelompok1',
  statusPtkp: 'TK/0',
  bentukKegiatan: 'USAHA_DAGANG',
  statusPerpajakanPasangan: 'TIDAK_ADA_PASANGAN',
  punyaLebihDariSatuKegiatan: false,
  omzetPribadiTahunPajak: 600_000_000,
  biayaOperasionalRiil: 200_000_000,
  omzetPribadiThnSebelumnya: 500_000_000,
  omzetPasanganThnSebelumnya: 0,
  omzetSeluruhPerseroanPeroranganThnSebelumnya: 0,
  sudahMemberitahukanNppn: false,
  pernahPilihTarifUmum: false,
  jugaPegawaiTetap: false,
  pernahMelewatiAmbang: false
};

function status(profil: ProfilWajibPajak, id: IdSkema): StatusKelayakan {
  const hasil = periksaKelayakan(profil);
  const skema = hasil.skema.find((item) => item.id === id);
  if (!skema) throw new Error(`Skema ${id} tidak ditemukan`);
  return skema.statusKelayakan;
}

describe('agregasi prioritas', () => {
  it('satu TIDAK_BOLEH menggugurkan seluruh syarat lain', () => {
    expect(
      agregasiPrioritas([
        { kode: 'A', status: 'BOLEH', alasan: '', dasarHukum: [] },
        { kode: 'B', status: 'PERLU_DIPASTIKAN', alasan: '', dasarHukum: [] },
        { kode: 'C', status: 'TIDAK_BOLEH', alasan: '', dasarHukum: [] }
      ])
    ).toBe('TIDAK_BOLEH');
  });

  it('PERLU_DIPASTIKAN mengalahkan BOLEH', () => {
    expect(
      agregasiPrioritas([
        { kode: 'A', status: 'BOLEH', alasan: '', dasarHukum: [] },
        { kode: 'B', status: 'PERLU_DIPASTIKAN', alasan: '', dasarHukum: [] }
      ])
    ).toBe('PERLU_DIPASTIKAN');
  });

  it('seluruh syarat BOLEH menghasilkan BOLEH', () => {
    expect(agregasiPrioritas([{ kode: 'A', status: 'BOLEH', alasan: '', dasarHukum: [] }])).toBe(
      'BOLEH'
    );
  });
});

describe('saringan pekerjaan bebas', () => {
  it('kreator konten tidak mendapat PPh Final karena disebut Pasal 56 ayat (4) huruf b', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      kluKode: '90002',
      bentukKegiatan: 'PEKERJAAN_BEBAS'
    };
    expect(status(profil, 'PPH_FINAL_05')).toBe('TIDAK_BOLEH');
  });

  it('usaha dagang yang memenuhi syarat mendapat PPh Final', () => {
    expect(status(dasar, 'PPH_FINAL_05')).toBe('BOLEH');
  });

  it('profesi yang tidak disebut satu per satu menghasilkan PERLU_DIPASTIKAN, bukan vonis pasti', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      kluKode: '62010',
      bentukKegiatan: 'PEKERJAAN_BEBAS'
    };
    expect(status(profil, 'PPH_FINAL_05')).toBe('PERLU_DIPASTIKAN');
  });

  it('pekerjaan bebas yang dijalankan sebagai usaha berpegawai menjadi PERLU_DIPASTIKAN', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      kluKode: '90002',
      bentukKegiatan: 'USAHA_JASA'
    };
    expect(status(profil, 'PPH_FINAL_05')).toBe('PERLU_DIPASTIKAN');
  });

  it('bentuk kegiatan yang belum pasti tidak menghasilkan vonis pasti', () => {
    expect(status({ ...dasar, bentukKegiatan: 'BELUM_PASTI' }, 'PPH_FINAL_05')).toBe(
      'PERLU_DIPASTIKAN'
    );
  });

  it('KLU yang belum dikenal tidak menghasilkan vonis pasti', () => {
    const belumDikenal: ProfilWajibPajak = {
      ...dasar,
      kluKode: 'BELUM-ADA',
      sudahMemberitahukanNppn: true
    };
    expect(status(belumDikenal, 'PPH_FINAL_05')).toBe('PERLU_DIPASTIKAN');
    expect(status(belumDikenal, 'NPPN')).toBe('PERLU_DIPASTIKAN');
  });
});

describe('saringan ambang peredaran bruto', () => {
  it('omzet konsolidasi melewati ambang menutup PPh Final', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      statusPerpajakanPasangan: 'PISAH_HARTA',
      omzetPribadiThnSebelumnya: 3_000_000_000,
      omzetPasanganThnSebelumnya: 2_000_000_000
    };
    expect(hitungOmzetKonsolidasi(profil)).toBe(5_000_000_000);
    expect(status(profil, 'PPH_FINAL_05')).toBe('TIDAK_BOLEH');
  });

  it('omzet konsolidasi tepat di ambang masih berhak karena batasnya inklusif', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      statusPerpajakanPasangan: 'PISAH_HARTA',
      omzetPribadiThnSebelumnya: 4_000_000_000,
      omzetPasanganThnSebelumnya: 800_000_000
    };
    expect(hitungOmzetKonsolidasi(profil)).toBe(4_800_000_000);
    expect(status(profil, 'PPH_FINAL_05')).toBe('BOLEH');
  });

  it('agregat perseroan melewati ambang memerlukan pemeriksaan transisi 2026', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      omzetPribadiThnSebelumnya: 4_000_000_000,
      omzetSeluruhPerseroanPeroranganThnSebelumnya: 1_000_000_000
    };
    expect(status(profil, 'PPH_FINAL_05')).toBe('PERLU_DIPASTIKAN');
  });

  it('omzet pasangan diabaikan bila pengguna belum menikah', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      omzetPasanganThnSebelumnya: 4_500_000_000
    };
    expect(hitungOmzetKonsolidasi(profil)).toBe(500_000_000);
    expect(status(profil, 'PPH_FINAL_05')).toBe('BOLEH');
  });

  it('status pasangan tidak yakin hanya menimbulkan keraguan bila mengubah vonis', () => {
    const mengubah: ProfilWajibPajak = {
      ...dasar,
      statusPerpajakanPasangan: 'TIDAK_YAKIN',
      omzetPribadiThnSebelumnya: 4_000_000_000,
      omzetPasanganThnSebelumnya: 1_500_000_000
    };
    expect(status(mengubah, 'PPH_FINAL_05')).toBe('PERLU_DIPASTIKAN');

    const tidakMengubah: ProfilWajibPajak = {
      ...dasar,
      statusPerpajakanPasangan: 'TIDAK_YAKIN',
      omzetPasanganThnSebelumnya: 100_000_000
    };
    expect(status(tidakMengubah, 'PPH_FINAL_05')).toBe('BOLEH');
  });

  it('pasangan yang melapor gabungan tetap digabungkan omzetnya', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      statusPerpajakanPasangan: 'GABUNG',
      omzetPribadiThnSebelumnya: 3_000_000_000,
      omzetPasanganThnSebelumnya: 2_000_000_000
    };
    expect(hitungOmzetKonsolidasi(profil)).toBe(5_000_000_000);
    expect(status(profil, 'PPH_FINAL_05')).toBe('TIDAK_BOLEH');
  });

  it('pasangan yang berpisah menurut putusan hakim tidak digabungkan', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      statusPerpajakanPasangan: 'PISAH_PUTUSAN_HAKIM',
      omzetPribadiThnSebelumnya: 3_000_000_000,
      omzetPasanganThnSebelumnya: 2_000_000_000
    };
    expect(hitungOmzetKonsolidasi(profil)).toBe(3_000_000_000);
    expect(status(profil, 'PPH_FINAL_05')).toBe('BOLEH');
  });

  it('omzet tahun berjalan tidak dipakai untuk uji ambang PPh Final', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      omzetPribadiTahunPajak: 9_000_000_000,
      omzetPribadiThnSebelumnya: 100_000_000
    };
    expect(status(profil, 'PPH_FINAL_05')).toBe('BOLEH');
  });
});

describe('saringan pintu satu arah', () => {
  it('pernah memilih tarif umum menutup PPh Final', () => {
    expect(status({ ...dasar, pernahPilihTarifUmum: true }, 'PPH_FINAL_05')).toBe('TIDAK_BOLEH');
  });

  it('tidak yakin soal tarif umum menghasilkan PERLU_DIPASTIKAN', () => {
    expect(status({ ...dasar, pernahPilihTarifUmum: 'tidak_yakin' }, 'PPH_FINAL_05')).toBe(
      'PERLU_DIPASTIKAN'
    );
  });

  it('pekerjaan bebas ditambah pasangan tidak yakin tetap TIDAK_BOLEH', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      kluKode: '90002',
      bentukKegiatan: 'PEKERJAAN_BEBAS',
      statusPerpajakanPasangan: 'TIDAK_YAKIN',
      omzetPribadiThnSebelumnya: 4_000_000_000,
      omzetPasanganThnSebelumnya: 1_500_000_000
    };
    expect(status(profil, 'PPH_FINAL_05')).toBe('TIDAK_BOLEH');
  });
});

describe('saringan NPPN', () => {
  it('pemberitahuan Norma yang belum disampaikan menutup NPPN', () => {
    expect(status(dasar, 'NPPN')).toBe('TIDAK_BOLEH');
  });

  it('pemberitahuan Norma tidak yakin menghasilkan PERLU_DIPASTIKAN', () => {
    expect(status({ ...dasar, sudahMemberitahukanNppn: 'tidak_yakin' }, 'NPPN')).toBe(
      'PERLU_DIPASTIKAN'
    );
  });

  it('sudah memberitahukan Norma dan di bawah ambang menghasilkan BOLEH', () => {
    expect(status({ ...dasar, sudahMemberitahukanNppn: true }, 'NPPN')).toBe('BOLEH');
  });

  it('ambang NPPN memakai omzet tahun berjalan dan bersifat eksklusif', () => {
    const tepatDiAmbang: ProfilWajibPajak = {
      ...dasar,
      sudahMemberitahukanNppn: true,
      omzetPribadiTahunPajak: 4_800_000_000
    };
    expect(status(tepatDiAmbang, 'NPPN')).toBe('TIDAK_BOLEH');

    const sedikitDiBawah: ProfilWajibPajak = {
      ...tepatDiAmbang,
      omzetPribadiTahunPajak: 4_799_999_999
    };
    expect(status(sedikitDiBawah, 'NPPN')).toBe('BOLEH');
  });
});

describe('tarif umum dan keluaran umum', () => {
  it('tarif umum tetap ditampilkan dan selalu terbuka', () => {
    const hasil = periksaKelayakan({ ...dasar, kluKode: '90002', bentukKegiatan: 'PEKERJAAN_BEBAS' });
    expect(hasil.skema.map((skema) => skema.id)).toEqual(['PPH_FINAL_05', 'NPPN', 'TARIF_UMUM']);
    expect(hasil.skema[2].statusKelayakan).toBe('BOLEH');
  });

  it('setiap skema membawa dasar hukum, tanpa kecuali', () => {
    const hasil = periksaKelayakan(dasar);
    for (const skema of hasil.skema) {
      expect(skema.dasarHukum.length).toBeGreaterThan(0);
      for (const dasarHukum of skema.dasarHukum) {
        expect(dasarHukum.pasalAtauLampiran.length).toBeGreaterThan(0);
        expect(dasarHukum.url).toMatch(/^https:\/\//);
      }
    }
  });

  it('omzet nol ditangani tanpa galat', () => {
    const profil: ProfilWajibPajak = {
      ...dasar,
      sudahMemberitahukanNppn: true,
      omzetPribadiTahunPajak: 0,
      omzetPribadiThnSebelumnya: 0,
      biayaOperasionalRiil: 0
    };
    expect(status(profil, 'PPH_FINAL_05')).toBe('BOLEH');
    expect(status(profil, 'NPPN')).toBe('BOLEH');
  });

  it('tahun pajak 2025 memunculkan peringatan ketentuan peralihan', () => {
    const hasil = periksaKelayakan({ ...dasar, tahunPajak: 2025 });
    expect(hasil.peringatan.some((teks) => teks.includes('2025'))).toBe(true);
  });

  it('tahun pajak 2026 tidak memunculkan peringatan peralihan', () => {
    const hasil = periksaKelayakan(dasar);
    expect(hasil.peringatan.some((teks) => teks.includes('PP 55/2022'))).toBe(false);
  });

  it('penghasilan campuran dengan gaji memunculkan peringatan SPT gabungan', () => {
    const hasil = periksaKelayakan({ ...dasar, jugaPegawaiTetap: true });
    expect(hasil.peringatan.some((teks) => teks.includes('SPT Tahunan'))).toBe(true);
  });

  it('melewati ambang memunculkan peringatan akibat lanjutan tahun berikutnya', () => {
    const hasil = periksaKelayakan({ ...dasar, omzetPribadiThnSebelumnya: 5_000_000_000 });
    expect(hasil.peringatan.some((teks) => teks.includes('Tahun Pajak-Tahun Pajak berikutnya'))).toBe(
      true
    );
  });

  it('selalu mengarahkan verifikasi ke DJP', () => {
    const hasil = periksaKelayakan(dasar);
    expect(hasil.langkahTindakLanjut.some((teks) => teks.includes('Coretax'))).toBe(true);
  });
});
