import basisAturanJson from '../../data/klu_rules.json';
import type {
  BasisTahun,
  BentukKegiatan,
  DasarHukumDetail,
  KelompokWilayahKey,
  OperatorAmbang,
  StatusPtkp,
  StatusVerifikasi,
  TahunPajak
} from '@/types/pajak';

/**
 * Pemuat basis aturan. Seluruh angka dan sitasi perpajakan tinggal di
 * `data/klu_rules.json` supaya regulasi dapat diperbarui tanpa menyentuh logika.
 * Bentuk berkas dijaga oleh `data/klu_rules.schema.json` dan diuji di
 * `tests/schema.test.ts` memakai Ajv Draft 2020-12.
 */

export type Ambang = {
  nilai: number;
  operator: OperatorAmbang;
  basisTahun: BasisTahun;
  statusVerifikasi: StatusVerifikasi;
  dasarHukum: DasarHukumDetail[];
};

export type Parameter<TNilai> = {
  nilai: TNilai;
  statusVerifikasi: StatusVerifikasi;
  dasarHukum: DasarHukumDetail[];
};

export type AturanKelayakanEntri = {
  kode: string;
  pesan?: string;
  pesanTidakBoleh?: string;
  pesanPerluDipastikan?: string;
  statusVerifikasi: StatusVerifikasi;
  dasarHukum: DasarHukumDetail[];
};

export type LapisanTarif = {
  lapisan: number;
  batasBawah: number;
  batasAtas: number | null;
  tarif: number;
};

export type EntriKlu = {
  kluKode: string;
  nama: string;
  /** Uraian resmi baris ini pada Lampiran I PER-17/PJ/2015, apa adanya. */
  uraianLampiran: string;
  alias: string[];
  bentukKegiatan: Exclude<BentukKegiatan, 'BELUM_PASTI'>;
  pekerjaanBebas: 'YA' | 'TIDAK' | 'PERLU_DIPASTIKAN';
  rujukanPasal56Ayat4: string | null;
  normaPersen: Record<KelompokWilayahKey, number>;
  dasarHukum: DasarHukumDetail[];
  /** Padanan kegiatan untuk rujukan; tidak mengganti kunci persentase Norma. */
  pemetaanKbli2020: {
    metode: 'PENCOCOKAN_URAIAN_DAN_TABEL_BPS';
    tanggalPemeriksaan: string;
    hubungan: 'SATU_PADANAN' | 'BEBERAPA_PADANAN';
    padanan: Array<{ kode: string; nama: string; halamanPdf: number }>;
    catatan: string;
    sumberKbli: string;
    halamanNorma: number;
  };
};

export type BasisAturan = {
  versiRegulasi: string;
  berlakuSejak: string;
  lembaranNegara: string;
  statusDokumen: string;
  tanggalVerifikasiTerakhir: string;
  tahunPajakDidukung: TahunPajak[];
  lingkupWajibPajak: 'ORANG_PRIBADI';
  kelompokWilayah: Record<KelompokWilayahKey, { nama: string; deskripsi: string }>;
  parameterPajak: {
    pphFinal: {
      tarif: Parameter<number>;
      ambangPeredaranBruto: Ambang;
      pembebasanOmzetOp: {
        nilai: number;
        basisTahun: BasisTahun;
        statusVerifikasi: StatusVerifikasi;
        dasarHukum: DasarHukumDetail[];
      };
    };
    nppn: {
      ambangPeredaranBruto: Ambang;
      batasWaktuPemberitahuan: {
        keterangan: string;
        layananCoretax: string;
        statusVerifikasi: StatusVerifikasi;
        dasarHukum: DasarHukumDetail[];
      };
    };
    tarifProgresif: {
      lapisan: LapisanTarif[];
      statusVerifikasi: StatusVerifikasi;
      dasarHukum: DasarHukumDetail[];
    };
    ptkp: {
      nilai: Record<StatusPtkp, number>;
      statusVerifikasi: StatusVerifikasi;
      dasarHukum: DasarHukumDetail[];
    };
  };
  aturanKelayakan: {
    pekerjaanBebas: AturanKelayakanEntri;
    ambangKonsolidasi: AturanKelayakanEntri;
    penggabunganSuamiIstriPisah: AturanKelayakanEntri;
    penggabunganSuamiIstriGabung: AturanKelayakanEntri;
    pintuSatuArahTarifUmum: AturanKelayakanEntri;
    pintuSatuArahLewatAmbang: AturanKelayakanEntri;
    pemberitahuanNppn: AturanKelayakanEntri;
    ketentuanPeralihan2025: AturanKelayakanEntri;
    ketentuanPeralihanAgregat2026: AturanKelayakanEntri;
  };
  klu: EntriKlu[];
};

/**
 * Satu-satunya titik konversi dari JSON mentah ke tipe domain. Bentuknya
 * dijamin oleh uji Ajv, bukan oleh pengecekan tipe TypeScript atas file JSON.
 */
export const basisAturan = basisAturanJson as unknown as BasisAturan;

/** Mencari satu KLU berdasarkan kodenya. Mengembalikan `undefined` bila tidak dikenal. */
export function cariKlu(kluKode: string): EntriKlu | undefined {
  return basisAturan.klu.find((entri) => entri.kluKode === kluKode);
}

/** Daftar KLU untuk pilihan formulir, diurutkan menurut nama. */
export function daftarKlu(): EntriKlu[] {
  return [...basisAturan.klu].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

/**
 * Persentase norma penghitungan penghasilan neto untuk satu KLU pada satu
 * kelompok wilayah. Lampiran I PER-17/PJ/2015 membedakan persentase per wilayah,
 * sehingga wilayah tidak boleh diabaikan.
 */
export function persenNorma(klu: EntriKlu, wilayah: KelompokWilayahKey): number {
  return klu.normaPersen[wilayah];
}

/** Menggabungkan beberapa daftar dasar hukum tanpa duplikat. */
export function gabungDasarHukum(...daftar: DasarHukumDetail[][]): DasarHukumDetail[] {
  const terlihat = new Set<string>();
  const hasil: DasarHukumDetail[] = [];
  for (const kelompok of daftar) {
    for (const entri of kelompok) {
      const kunci = `${entri.namaRegulasi}|${entri.pasalAtauLampiran}`;
      if (terlihat.has(kunci)) continue;
      terlihat.add(kunci);
      hasil.push(entri);
    }
  }
  return hasil;
}
