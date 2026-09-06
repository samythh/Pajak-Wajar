import type { LapisanTarif } from '@/lib/regulasi';
import type {
  LapisanTerpakai,
  RincianNppn,
  RincianPphFinal,
  RincianTarifUmum
} from '@/types/pajak';

/**
 * Fungsi matematika murni. Berkas ini sengaja tidak memuat penilaian hukum:
 * seluruh parameter regulasi (tarif, ambang, PTKP, norma) diterima sebagai
 * argumen dari `data/klu_rules.json`. Keputusan boleh atau tidaknya sebuah
 * skema adalah urusan `eligibility.ts`.
 */

/** Membulatkan ke rupiah penuh. Pajak terutang tidak mengenal pecahan sen. */
function bulatkanRupiah(nilai: number): number {
  return Math.round(nilai);
}

/** PKP dibulatkan ke bawah ke ribuan penuh, UU PPh Pasal 17 ayat (4). */
export function bulatkanPkp(nilai: number): number {
  return Math.floor(Math.max(0, nilai) / 1000) * 1000;
}

/**
 * Menghitung pajak progresif secara BERLAPIS: setiap lapisan hanya dikenakan
 * pada bagian PKP yang jatuh di dalamnya, bukan satu tarif untuk seluruh PKP.
 *
 * @param pkp Penghasilan Kena Pajak yang sudah dibulatkan ke bawah.
 * @param lapisan Lapisan tarif dari `parameterPajak.tarifProgresif.lapisan`
 *   (UU No. 7 Tahun 2021, Pasal 17 ayat (1) huruf a UU PPh).
 */
export function hitungTarifProgresifBerlapis(
  pkp: number,
  lapisan: LapisanTarif[]
): { pajak: number; lapisanTerpakai: LapisanTerpakai[] } {
  const sisaAwal = bulatkanPkp(pkp);
  const lapisanTerpakai: LapisanTerpakai[] = [];
  let pajak = 0;

  for (const baris of lapisan) {
    const batasAtas = baris.batasAtas ?? Number.POSITIVE_INFINITY;
    if (sisaAwal <= baris.batasBawah) break;

    const bagianPkp = Math.min(sisaAwal, batasAtas) - baris.batasBawah;
    if (bagianPkp <= 0) continue;

    const pajakLapisan = bagianPkp * baris.tarif;
    pajak += pajakLapisan;
    lapisanTerpakai.push({
      lapisan: baris.lapisan,
      batasBawah: baris.batasBawah,
      batasAtas: baris.batasAtas,
      tarif: baris.tarif,
      bagianPkp,
      pajakLapisan: bulatkanRupiah(pajakLapisan)
    });
  }

  return { pajak: bulatkanRupiah(pajak), lapisanTerpakai };
}

/**
 * PPh Final UMKM 0,5%.
 *
 * Dasar pengenaan memakai omzet PRIBADI tahun pajak berjalan dikurangi bagian
 * peredaran bruto yang dibebaskan. Omzet pasangan dan perseroan perorangan
 * hanya dipakai untuk uji ambang di `eligibility.ts`, tidak pernah di sini.
 *
 * Rujukan: PP 20/2026 Pasal 56 ayat (2) untuk tarif; UU No. 7 Tahun 2021
 * Pasal 7 ayat (2a) UU PPh jo. PP 55/2022 Pasal 60 untuk pembebasan Rp500 juta.
 */
export function hitungPphFinal(params: {
  omzetPribadi: number;
  batasPembebasan: number;
  tarif: number;
}): RincianPphFinal {
  const omzetPribadi = Math.max(0, params.omzetPribadi);
  const dasarPengenaan = Math.max(0, omzetPribadi - params.batasPembebasan);
  return {
    skema: 'PPH_FINAL_05',
    omzetPribadi,
    batasPembebasan: params.batasPembebasan,
    dasarPengenaan,
    tarif: params.tarif,
    pajakTerutang: bulatkanRupiah(dasarPengenaan * params.tarif)
  };
}

/**
 * Norma Penghitungan Penghasilan Neto (NPPN).
 *
 * Penghasilan neto diperkirakan dari persentase norma menurut KLU dan kelompok
 * wilayah, lalu dikurangi PTKP dan dikenai tarif progresif berlapis. Kredit
 * bukti potong mengurangi pajak terutang, dan hasilnya tidak dibuat negatif
 * karena lebih bayar ditangani lewat SPT, bukan lewat alat bantu ini.
 *
 * Rujukan: PER-17/PJ/2015 Lampiran I untuk persentase norma;
 * UU No. 7 Tahun 2021 Pasal 7 ayat (1) dan Pasal 17 ayat (1) huruf a UU PPh.
 */
export function hitungNppn(params: {
  omzetPribadi: number;
  persenNorma: number;
  ptkp: number;
  kreditBupot: number;
  lapisan: LapisanTarif[];
  penghasilanNetoPegawai?: number;
}): RincianNppn {
  const omzetPribadi = Math.max(0, params.omzetPribadi);
  const penghasilanNetoUsaha = omzetPribadi * (params.persenNorma / 100);
  const penghasilanNetoPegawai = Math.max(0, params.penghasilanNetoPegawai ?? 0);
  const penghasilanNeto = penghasilanNetoUsaha + penghasilanNetoPegawai;
  const pkp = bulatkanPkp(penghasilanNeto - params.ptkp);
  const { pajak, lapisanTerpakai } = hitungTarifProgresifBerlapis(pkp, params.lapisan);
  const kreditBupot = Math.max(0, params.kreditBupot);

  return {
    skema: 'NPPN',
    omzetPribadi,
    persenNorma: params.persenNorma,
    penghasilanNeto,
    penghasilanNetoUsaha,
    penghasilanNetoPegawai,
    ptkp: params.ptkp,
    pkp,
    pajakSebelumKredit: pajak,
    kreditBupot,
    pajakTerutang: Math.max(0, pajak - kreditBupot),
    kelebihanKredit: Math.max(0, kreditBupot - pajak),
    lapisanTerpakai
  };
}

/**
 * Tarif umum Pasal 17 atas dasar pembukuan.
 *
 * Biaya operasional wajib diisi pemanggil. Nilai `undefined` tidak boleh
 * diperlakukan sebagai Rp0 karena akan melambungkan pajak; pemblokiran itu
 * ditangani orkestrator sebelum fungsi ini dipanggil.
 *
 * Rujukan: UU No. 7 Tahun 2021 Pasal 7 ayat (1) dan Pasal 17 ayat (1) huruf a UU PPh.
 */
export function hitungTarifUmum(params: {
  omzetPribadi: number;
  biayaOperasional: number;
  ptkp: number;
  kreditBupot: number;
  lapisan: LapisanTarif[];
  penghasilanNetoPegawai?: number;
}): RincianTarifUmum {
  const omzetPribadi = Math.max(0, params.omzetPribadi);
  const biayaOperasional = Math.max(0, params.biayaOperasional);
  const penghasilanNetoUsaha = Math.max(0, omzetPribadi - biayaOperasional);
  const penghasilanNetoPegawai = Math.max(0, params.penghasilanNetoPegawai ?? 0);
  const penghasilanNeto = penghasilanNetoUsaha + penghasilanNetoPegawai;
  const pkp = bulatkanPkp(penghasilanNeto - params.ptkp);
  const { pajak, lapisanTerpakai } = hitungTarifProgresifBerlapis(pkp, params.lapisan);
  const kreditBupot = Math.max(0, params.kreditBupot);

  return {
    skema: 'TARIF_UMUM',
    omzetPribadi,
    biayaOperasional,
    penghasilanNeto,
    penghasilanNetoUsaha,
    penghasilanNetoPegawai,
    ptkp: params.ptkp,
    pkp,
    pajakSebelumKredit: pajak,
    kreditBupot,
    pajakTerutang: Math.max(0, pajak - kreditBupot),
    kelebihanKredit: Math.max(0, kreditBupot - pajak),
    lapisanTerpakai
  };
}

/**
 * Menjumlahkan PPh yang sudah dipotong pihak lain untuk dikreditkan.
 * Rujukan: UU PPh Pasal 28 ayat (1).
 */
export function totalKreditBupot(daftar: Array<{ pphDipotong: number }>): number {
  return daftar.reduce((jumlah, item) => jumlah + Math.max(0, item.pphDipotong), 0);
}
