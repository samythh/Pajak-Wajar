/**
 * Kontrak tipe bersama untuk frontend, mesin aturan, kalkulator, OCR, dan berkas PDF.
 * Tipe `any` dilarang di seluruh berkas ini.
 */

export type TahunPajak = 2025 | 2026;

export type KelompokWilayahKey = 'kelompok1' | 'kelompok2' | 'kelompok3';

export type StatusPtkp = 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3' | 'K/0' | 'K/1' | 'K/2' | 'K/3';

export type JawabanKepatuhan = boolean | 'tidak_yakin';

export type StatusPerpajakanPasangan =
  | 'TIDAK_ADA_PASANGAN'
  | 'GABUNG'
  | 'PISAH_HARTA'
  | 'PISAH_KEWAJIBAN'
  /** Hidup berpisah berdasarkan putusan hakim, UU PPh Pasal 8 ayat (2) huruf a. */
  | 'PISAH_PUTUSAN_HAKIM'
  | 'TIDAK_YAKIN';

export type BentukKegiatan = 'PEKERJAAN_BEBAS' | 'USAHA_JASA' | 'USAHA_DAGANG' | 'BELUM_PASTI';

export type StatusVerifikasi = 'TERVERIFIKASI' | 'DALAM_REVIEW';

export type OperatorAmbang = 'LT' | 'LTE';

export type BasisTahun = 'TAHUN_PAJAK_BERJALAN' | 'TAHUN_PAJAK_SEBELUMNYA';

export type IdSkema = 'PPH_FINAL_05' | 'NPPN' | 'TARIF_UMUM';

export type StatusKelayakan = 'BOLEH' | 'TIDAK_BOLEH' | 'PERLU_DIPASTIKAN';

export type StatusKalkulasi =
  /** Seluruh parameter tersedia dan sudah dihitung. */
  | 'TERSEDIA'
  /** Parameter wajib masih dalam review atau melebihi batas sistem. */
  | 'BELUM_TERSEDIA'
  /** Skema tidak berhak dipakai, sehingga nominal tidak ditampilkan. */
  | 'TIDAK_RELEVAN';

export type DasarHukumDetail = {
  namaRegulasi: string;
  pasalAtauLampiran: string;
  fungsi: string;
  url: string;
  statusVerifikasi: StatusVerifikasi;
};

// ---------------------------------------------------------------------------
// Masukan
// ---------------------------------------------------------------------------

export type ProfilWajibPajak = {
  tahunPajak: TahunPajak;
  kluKode: string;
  wilayah: KelompokWilayahKey;
  statusPtkp: StatusPtkp;
  /**
   * Cara kegiatan dijalankan. Penjelasan PP 20/2026 Pasal 56 ayat (4)
   * membedakan orang yang menjual keahliannya sendiri dari orang yang
   * menjalankan usaha dan mempekerjakan orang lain.
   */
  bentukKegiatan: BentukKegiatan;
  statusPerpajakanPasangan: StatusPerpajakanPasangan;
  punyaLebihDariSatuKegiatan: JawabanKepatuhan;

  /** Tahun pajak berjalan — dasar KALKULASI dan uji ambang NPPN. */
  omzetPribadiTahunPajak: number;
  /** Biaya usaha riil; wajib diisi agar Tarif Umum dapat dihitung. */
  biayaOperasionalRiil?: number;

  /** Tahun pajak sebelumnya — dasar UJI AMBANG PPh Final (Pasal 58 ayat (1)). */
  omzetPribadiThnSebelumnya: number;
  omzetPasanganThnSebelumnya: number;
  omzetSeluruhPerseroanPeroranganThnSebelumnya: number;

  sudahMemberitahukanNppn: JawabanKepatuhan;
  pernahPilihTarifUmum: JawabanKepatuhan;
  jugaPegawaiTetap: boolean;
  /** Neto gaji setahun dari bukti potong pegawai, sebelum pengurangan PTKP. */
  penghasilanNetoPegawai?: number;
  /** Riwayat ambang untuk tahun sebelum tahun pembanding; kosong berarti belum pasti. */
  pernahMelewatiAmbang?: JawabanKepatuhan;
};

export type KreditPajakItem = {
  /** Nomor bukti potong; kosong bila pengguna belum menyalinnya. */
  nomorBuktiPotong: string;
  /** Nama pemberi penghasilan yang memotong. */
  pemotong: string;
  penghasilanBruto: number;
  pphDipotong: number;
  /** `MANUAL` bila diketik pengguna, `OCR` bila dibaca dari foto dengan persetujuan. */
  sumber: 'MANUAL' | 'OCR';
};

export type InputAuditPajak = {
  profil: ProfilWajibPajak;
  kreditPajak: KreditPajakItem[];
};

// ---------------------------------------------------------------------------
// Rincian kalkulasi (discriminated union berdasarkan `skema`)
// ---------------------------------------------------------------------------

export type RincianPphFinal = {
  skema: 'PPH_FINAL_05';
  omzetPribadi: number;
  batasPembebasan: number;
  dasarPengenaan: number;
  tarif: number;
  pajakTerutang: number;
};

export type LapisanTerpakai = {
  lapisan: number;
  batasBawah: number;
  batasAtas: number | null;
  tarif: number;
  bagianPkp: number;
  pajakLapisan: number;
};

export type RincianNppn = {
  skema: 'NPPN';
  omzetPribadi: number;
  persenNorma: number;
  penghasilanNeto: number;
  penghasilanNetoUsaha: number;
  penghasilanNetoPegawai: number;
  ptkp: number;
  pkp: number;
  pajakSebelumKredit: number;
  kreditBupot: number;
  pajakTerutang: number;
  kelebihanKredit: number;
  lapisanTerpakai: LapisanTerpakai[];
};

export type RincianTarifUmum = {
  skema: 'TARIF_UMUM';
  omzetPribadi: number;
  biayaOperasional: number;
  penghasilanNeto: number;
  penghasilanNetoUsaha: number;
  penghasilanNetoPegawai: number;
  ptkp: number;
  pkp: number;
  pajakSebelumKredit: number;
  kreditBupot: number;
  pajakTerutang: number;
  kelebihanKredit: number;
  lapisanTerpakai: LapisanTerpakai[];
};

export type RincianKalkulasi = RincianPphFinal | RincianNppn | RincianTarifUmum;

// ---------------------------------------------------------------------------
// Hasil per skema
// ---------------------------------------------------------------------------

/** Satu syarat yang diuji mesin aturan, lengkap dengan rujukannya. */
export type SyaratKelayakan = {
  kode: string;
  status: StatusKelayakan;
  alasan: string;
  dasarHukum: DasarHukumDetail[];
};

type KelayakanBersama = {
  statusKelayakan: StatusKelayakan;
  syarat: SyaratKelayakan[];
  alasanKelayakan: string[];
  dasarHukum: DasarHukumDetail[];
  konsekuensiJangkaPanjang?: string;
};

/**
 * Status kalkulasi dibentuk sebagai discriminated union agar nominal dan
 * rincian mustahil muncul pada status yang melarangnya.
 */
type KalkulasiTersedia<TRincian extends RincianKalkulasi> = {
  statusKalkulasi: 'TERSEDIA';
  pajakTerutang: number;
  rincianKalkulasi: TRincian;
};

type KalkulasiTidakAda = {
  statusKalkulasi: 'BELUM_TERSEDIA' | 'TIDAK_RELEVAN';
  alasanKalkulasi: string;
};

type Kalkulasi<TRincian extends RincianKalkulasi> = KalkulasiTersedia<TRincian> | KalkulasiTidakAda;

export type HasilSkemaPphFinal = KelayakanBersama &
  Kalkulasi<RincianPphFinal> & { id: 'PPH_FINAL_05' };

export type HasilSkemaNppn = KelayakanBersama & Kalkulasi<RincianNppn> & { id: 'NPPN' };

export type HasilSkemaTarifUmum = KelayakanBersama &
  Kalkulasi<RincianTarifUmum> & { id: 'TARIF_UMUM' };

export type HasilSkema = HasilSkemaPphFinal | HasilSkemaNppn | HasilSkemaTarifUmum;

export type HasilKelayakan = {
  skema: HasilSkema[];
  peringatan: string[];
  langkahTindakLanjut: string[];
};

export type HasilAuditPajak = {
  versiRegulasi: string;
  tanggalAudit: string;
  profil: ProfilWajibPajak;
  totalKreditBupot: number;
  skema: HasilSkema[];
  peringatan: string[];
  langkahTindakLanjut: string[];
  /** Skema termurah di antara yang berstatus BOLEH dan sudah terhitung. */
  rekomendasiHemat?: { id: IdSkema; pajakTerutang: number };
};
