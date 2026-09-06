import { auditPajakMandiri } from '@/lib/index';
import type { HasilAuditPajak, InputAuditPajak, ProfilWajibPajak } from '@/types/pajak';

/**
 * Profil contoh untuk demo, tangkapan layar, dan pengujian manual.
 *
 * Sejak mesin aturan tersambung, berkas ini tidak lagi berisi vonis palsu:
 * hasilnya dihitung mesin yang sama dengan yang dipakai pengguna, sehingga
 * demo tidak pernah menampilkan angka yang tidak dapat direproduksi.
 */

const dasar: ProfilWajibPajak = {
  tahunPajak: 2026,
  kluKode: '90002',
  wilayah: 'kelompok1',
  statusPtkp: 'TK/0',
  bentukKegiatan: 'PEKERJAAN_BEBAS',
  statusPerpajakanPasangan: 'TIDAK_ADA_PASANGAN',
  punyaLebihDariSatuKegiatan: false,
  omzetPribadiTahunPajak: 420_000_000,
  biayaOperasionalRiil: 95_000_000,
  omzetPribadiThnSebelumnya: 310_000_000,
  omzetPasanganThnSebelumnya: 0,
  omzetSeluruhPerseroanPeroranganThnSebelumnya: 0,
  sudahMemberitahukanNppn: true,
  pernahPilihTarifUmum: false,
  jugaPegawaiTetap: false,
  pernahMelewatiAmbang: false
};

/** Kreator konten: pekerjaan bebas, sehingga PPh Final tertutup. */
export const profilKreator: ProfilWajibPajak = dasar;

/** Pedagang daring: berhak PPh Final 0,5%. */
export const profilPedagang: ProfilWajibPajak = {
  ...dasar,
  kluKode: '47919',
  bentukKegiatan: 'USAHA_DAGANG',
  statusPtkp: 'TK/0',
  omzetPribadiTahunPajak: 900_000_000,
  biayaOperasionalRiil: 620_000_000,
  omzetPribadiThnSebelumnya: 780_000_000
};

/** Pasangan pisah harta yang gabungan omzetnya melewati ambang Rp4,8 miliar. */
export const profilLewatAmbang: ProfilWajibPajak = {
  ...profilPedagang,
  statusPerpajakanPasangan: 'PISAH_HARTA',
  omzetPribadiThnSebelumnya: 3_000_000_000,
  omzetPasanganThnSebelumnya: 2_000_000_000
};

export const contohInput: InputAuditPajak = {
  profil: profilKreator,
  kreditPajak: [
    {
      nomorBuktiPotong: 'BP-2026-0142',
      pemotong: 'PT Media Kreatif Nusantara',
      penghasilanBruto: 120_000_000,
      pphDipotong: 6_000_000,
      sumber: 'MANUAL'
    }
  ]
};

/** Hasil demo yang dihitung mesin aturan sungguhan. */
export function contohHasil(): HasilAuditPajak {
  return auditPajakMandiri(contohInput);
}
