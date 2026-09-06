import { hitungNppn, hitungPphFinal, hitungTarifUmum, totalKreditBupot } from '@/lib/calculator';
import { periksaKelayakan } from '@/lib/eligibility';
import type { KelayakanSkema } from '@/lib/eligibility';
import { basisAturan, cariKlu, persenNorma } from '@/lib/regulasi';
import { inputAuditPajakSchema } from '@/lib/schemas';
import { susunSaran } from '@/lib/saran';
import type {
  HasilAuditPajak,
  HasilSkema,
  HasilSkemaNppn,
  HasilSkemaPphFinal,
  HasilSkemaTarifUmum,
  IdSkema,
  InputAuditPajak
} from '@/types/pajak';

/**
 * Orkestrator tunggal: validasi masukan, uji kelayakan, lalu hitung hanya untuk
 * skema yang berhak dan yang seluruh parameternya sudah terverifikasi.
 *
 * Status kelayakan (legal) tidak pernah diturunkan gara-gara kalkulasi diblokir.
 */

const PARAMETER = basisAturan.parameterPajak;

class GalatMasukan extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = 'GalatMasukan';
  }
}

function kelayakanDari(daftar: KelayakanSkema[], id: IdSkema): KelayakanSkema {
  const ditemukan = daftar.find((item) => item.id === id);
  if (!ditemukan) throw new GalatMasukan(`Skema ${id} tidak dihasilkan mesin kelayakan.`);
  return ditemukan;
}

function bagianKelayakan(skema: KelayakanSkema) {
  return {
    statusKelayakan: skema.statusKelayakan,
    syarat: skema.syarat,
    alasanKelayakan: skema.alasanKelayakan,
    dasarHukum: skema.dasarHukum,
    konsekuensiJangkaPanjang: skema.konsekuensiJangkaPanjang
  };
}

const ALASAN_TIDAK_RELEVAN =
  'Perkiraan nominal tidak ditampilkan karena hak memakai skema ini belum pasti. Selesaikan dulu bagian yang perlu dipastikan.';

/**
 * Menjalankan pemeriksaan penuh untuk satu profil Wajib Pajak orang pribadi.
 *
 * @throws {GalatMasukan} bila masukan tidak lolos skema Zod.
 */
export function auditPajakMandiri(input: InputAuditPajak): HasilAuditPajak {
  const tervalidasi = inputAuditPajakSchema.safeParse(input);
  if (!tervalidasi.success) {
    const rincian = tervalidasi.error.issues
      .map((issue) => `${issue.path.join('.') || 'masukan'}: ${issue.message}`)
      .join('; ');
    throw new GalatMasukan(`Masukan belum lengkap atau tidak wajar. ${rincian}`);
  }

  const { profil, kreditPajak } = tervalidasi.data;
  const kelayakan = periksaKelayakan(profil);
  const klu = cariKlu(profil.kluKode);
  const kreditBupot = totalKreditBupot(kreditPajak);
  const netoPegawai = profil.jugaPegawaiTetap ? profil.penghasilanNetoPegawai : 0;
  const batasKeluarga = profil.statusPerpajakanPasangan !== 'TIDAK_ADA_PASANGAN' &&
    profil.statusPerpajakanPasangan !== 'PISAH_PUTUSAN_HAKIM';
  // Neto pasangan dan pembagian pajak PH/MT tidak dapat diturunkan dari omzet.
  const alasanBatas = profil.statusPtkp.startsWith('K/') && profil.statusPerpajakanPasangan === 'TIDAK_ADA_PASANGAN'
    ? 'Status PTKP kawin belum sesuai dengan jawaban tidak ada pasangan. Periksa keadaan keluarga pada awal tahun pajak sebelum menghitung.'
    : batasKeluarga
    ? 'Perhitungan pajak keluarga belum tersedia. Neto pasangan, status penggabungan penghasilan, PTKP keluarga, dan pembagian pajak perlu diperiksa bersama; omzet pasangan saja tidak cukup.'
    : profil.jugaPegawaiTetap && netoPegawai === undefined
      ? 'Isi penghasilan neto dari bukti potong pegawai sebelum menghitung gabungan gaji dan usaha. PTKP hanya dikurangkan satu kali.'
      : undefined;

  // ----- PPh Final 0,5% -----
  const kelayakanFinal = kelayakanDari(kelayakan.skema, 'PPH_FINAL_05');
  const pembebasan = PARAMETER.pphFinal.pembebasanOmzetOp;
  let skemaFinal: HasilSkemaPphFinal;

  if (kelayakanFinal.statusKelayakan !== 'BOLEH') {
    skemaFinal = {
      id: 'PPH_FINAL_05',
      ...bagianKelayakan(kelayakanFinal),
      statusKalkulasi: 'TIDAK_RELEVAN',
      alasanKalkulasi: kelayakanFinal.statusKelayakan === 'TIDAK_BOLEH'
        ? 'Nominal tidak dihitung karena skema ini tidak boleh dipakai berdasarkan jawaban Anda. Lihat alasan dan dasar hukumnya di atas.'
        : ALASAN_TIDAK_RELEVAN
    };
  } else if (pembebasan.statusVerifikasi === 'DALAM_REVIEW') {
    skemaFinal = {
      id: 'PPH_FINAL_05',
      ...bagianKelayakan(kelayakanFinal),
      statusKalkulasi: 'BELUM_TERSEDIA',
      alasanKalkulasi:
        'Dasar pembebasan Rp500 juta masih dalam pemeriksaan ke teks asli, sehingga nominalnya belum kami tampilkan.'
    };
  } else {
    const rincian = hitungPphFinal({
      omzetPribadi: profil.omzetPribadiTahunPajak,
      batasPembebasan: pembebasan.nilai,
      tarif: PARAMETER.pphFinal.tarif.nilai
    });
    skemaFinal = {
      id: 'PPH_FINAL_05',
      ...bagianKelayakan(kelayakanFinal),
      statusKalkulasi: 'TERSEDIA',
      pajakTerutang: rincian.pajakTerutang,
      rincianKalkulasi: rincian
    };
  }

  // ----- Norma NPPN -----
  const kelayakanNppn = kelayakanDari(kelayakan.skema, 'NPPN');
  let skemaNppn: HasilSkemaNppn;

  if (kelayakanNppn.statusKelayakan !== 'BOLEH') {
    skemaNppn = {
      id: 'NPPN',
      ...bagianKelayakan(kelayakanNppn),
      statusKalkulasi: 'TIDAK_RELEVAN',
      alasanKalkulasi: kelayakanNppn.statusKelayakan === 'TIDAK_BOLEH'
        ? 'Nominal tidak dihitung karena persyaratan penggunaan Norma belum terpenuhi. Lihat alasan dan dasar hukumnya di atas.'
        : ALASAN_TIDAK_RELEVAN
    };
  } else if (alasanBatas) {
    skemaNppn = { id: 'NPPN', ...bagianKelayakan(kelayakanNppn), statusKalkulasi: 'BELUM_TERSEDIA', alasanKalkulasi: alasanBatas };
  } else if (!klu) {
    skemaNppn = {
      id: 'NPPN',
      ...bagianKelayakan(kelayakanNppn),
      statusKalkulasi: 'BELUM_TERSEDIA',
      alasanKalkulasi: 'Persentase Norma belum tersedia untuk pekerjaan yang Anda pilih.'
    };
  } else if (profil.punyaLebihDariSatuKegiatan !== false) {
    skemaNppn = {
      id: 'NPPN',
      ...bagianKelayakan(kelayakanNppn),
      statusKalkulasi: 'BELUM_TERSEDIA',
      alasanKalkulasi:
        'Persentase Norma berbeda untuk tiap kegiatan, jadi omzet gabungan tidak boleh dikalikan satu persentase saja. Hitung tiap kegiatan secara terpisah.'
    };
  } else {
    const rincian = hitungNppn({
      omzetPribadi: profil.omzetPribadiTahunPajak,
      persenNorma: persenNorma(klu, profil.wilayah),
      ptkp: PARAMETER.ptkp.nilai[profil.statusPtkp],
      kreditBupot,
      penghasilanNetoPegawai: netoPegawai,
      lapisan: PARAMETER.tarifProgresif.lapisan
    });
    skemaNppn = {
      id: 'NPPN',
      ...bagianKelayakan(kelayakanNppn),
      statusKalkulasi: 'TERSEDIA',
      pajakTerutang: rincian.pajakTerutang,
      rincianKalkulasi: rincian
    };
  }

  // ----- Tarif umum -----
  const kelayakanTarifUmum = kelayakanDari(kelayakan.skema, 'TARIF_UMUM');
  let skemaTarifUmum: HasilSkemaTarifUmum;

  if (kelayakanTarifUmum.statusKelayakan !== 'BOLEH') {
    skemaTarifUmum = {
      id: 'TARIF_UMUM',
      ...bagianKelayakan(kelayakanTarifUmum),
      statusKalkulasi: 'TIDAK_RELEVAN',
      alasanKalkulasi: ALASAN_TIDAK_RELEVAN
    };
  } else if (alasanBatas) {
    skemaTarifUmum = { id: 'TARIF_UMUM', ...bagianKelayakan(kelayakanTarifUmum), statusKalkulasi: 'BELUM_TERSEDIA', alasanKalkulasi: alasanBatas };
  } else if (profil.biayaOperasionalRiil === undefined) {
    skemaTarifUmum = {
      id: 'TARIF_UMUM',
      ...bagianKelayakan(kelayakanTarifUmum),
      statusKalkulasi: 'BELUM_TERSEDIA',
      alasanKalkulasi:
        'Isi dulu total biaya usaha setahun. Biaya yang dikosongkan tidak boleh dianggap Rp0 karena membuat pajaknya terlihat jauh lebih besar dari seharusnya.'
    };
  } else if (profil.jugaPegawaiTetap && profil.biayaOperasionalRiil > profil.omzetPribadiTahunPajak) {
    skemaTarifUmum = { id: 'TARIF_UMUM', ...bagianKelayakan(kelayakanTarifUmum), statusKalkulasi: 'BELUM_TERSEDIA', alasanKalkulasi: 'Biaya usaha melebihi omzet. Perlakuan rugi usaha terhadap penghasilan pegawai perlu diperiksa sebelum pajak gabungan dihitung.' };
  } else {
    const rincian = hitungTarifUmum({
      omzetPribadi: profil.omzetPribadiTahunPajak,
      biayaOperasional: profil.biayaOperasionalRiil,
      ptkp: PARAMETER.ptkp.nilai[profil.statusPtkp],
      kreditBupot,
      penghasilanNetoPegawai: netoPegawai,
      lapisan: PARAMETER.tarifProgresif.lapisan
    });
    skemaTarifUmum = {
      id: 'TARIF_UMUM',
      ...bagianKelayakan(kelayakanTarifUmum),
      statusKalkulasi: 'TERSEDIA',
      pajakTerutang: rincian.pajakTerutang,
      rincianKalkulasi: rincian
    };
  }

  const skema: HasilSkema[] = [skemaFinal, skemaNppn, skemaTarifUmum];

  const terhitung = skema.filter(
    (item): item is HasilSkema & { statusKalkulasi: 'TERSEDIA'; pajakTerutang: number } =>
      item.statusKalkulasi === 'TERSEDIA'
  );

  // Final adalah pajak usaha sebelum setoran, sementara skema umum dikurangi kredit.
  // Jangan membandingkan sisa bayar dengan pajak bruto atau total gaji dengan usaha saja.
  const rekomendasiHemat = terhitung.length === skema.length && kreditBupot === 0 && !profil.jugaPegawaiTetap
    ? terhitung.reduce((termurah, kandidat) =>
        kandidat.pajakTerutang < termurah.pajakTerutang ? kandidat : termurah
      )
    : undefined;

  const hasil: HasilAuditPajak = {
    versiRegulasi: basisAturan.versiRegulasi,
    tanggalAudit: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    profil,
    totalKreditBupot: kreditBupot,
    skema,
    peringatan: [...kelayakan.peringatan, ...(alasanBatas ? [alasanBatas] : []),
      ...(skema.some((s) => s.statusKalkulasi === 'TERSEDIA' && s.rincianKalkulasi.skema !== 'PPH_FINAL_05' && s.rincianKalkulasi.kelebihanKredit > 0) ? ['Kredit pajak melebihi perkiraan pajak pada salah satu skema. Selisih ditampilkan untuk dicocokkan dalam SPT; bukan janji pengembalian pajak.'] : [])],
    langkahTindakLanjut: kelayakan.langkahTindakLanjut,
    rekomendasiHemat: rekomendasiHemat
      ? { id: rekomendasiHemat.id, pajakTerutang: rekomendasiHemat.pajakTerutang }
      : undefined
  };
  return { ...hasil, langkahTindakLanjut: susunSaran(hasil) };
}

export { GalatMasukan };
export { periksaKelayakan } from '@/lib/eligibility';
export { basisAturan, cariKlu, daftarKlu } from '@/lib/regulasi';
