import { basisAturan, cariKlu, gabungDasarHukum } from '@/lib/regulasi';
import type { AturanKelayakanEntri, EntriKlu } from '@/lib/regulasi';
import type {
  DasarHukumDetail,
  IdSkema,
  ProfilWajibPajak,
  StatusKelayakan,
  SyaratKelayakan
} from '@/types/pajak';

/**
 * Mesin saringan kelayakan. Seluruh vonis lahir dari aturan eksplisit di
 * `data/klu_rules.json`; tidak ada model bahasa yang dilibatkan di sini.
 *
 * Urutan produk selalu KELAYAKAN → PERHITUNGAN, sehingga berkas ini tidak
 * pernah menghitung nominal pajak.
 */

const AMBANG = basisAturan.parameterPajak;
const ATURAN = basisAturan.aturanKelayakan;

export type KelayakanSkema = {
  id: IdSkema;
  statusKelayakan: StatusKelayakan;
  syarat: SyaratKelayakan[];
  alasanKelayakan: string[];
  dasarHukum: DasarHukumDetail[];
  konsekuensiJangkaPanjang?: string;
};

export type HasilPemeriksaanKelayakan = {
  skema: KelayakanSkema[];
  peringatan: string[];
  langkahTindakLanjut: string[];
  omzetKonsolidasiThnSebelumnya: number;
  omzetPribadiThnSebelumnya: number;
};

/**
 * Agregasi prioritas: satu vonis `TIDAK_BOLEH` menggugurkan seluruh syarat lain,
 * dan `PERLU_DIPASTIKAN` mengalahkan `BOLEH`. Sistem tidak boleh memberi vonis
 * pasti dari data yang tidak pasti.
 */
export function agregasiPrioritas(syarat: SyaratKelayakan[]): StatusKelayakan {
  if (syarat.some((item) => item.status === 'TIDAK_BOLEH')) return 'TIDAK_BOLEH';
  if (syarat.some((item) => item.status === 'PERLU_DIPASTIKAN')) return 'PERLU_DIPASTIKAN';
  return 'BOLEH';
}

function syaratDari(
  aturan: AturanKelayakanEntri,
  status: StatusKelayakan,
  alasan: string
): SyaratKelayakan {
  return { kode: aturan.kode, status, alasan, dasarHukum: aturan.dasarHukum };
}

/**
 * Peredaran bruto gabungan untuk uji ambang PPh Final.
 *
 * Rujukan: PP 20/2026 Pasal 57 ayat (2) huruf e (WP orang pribadi beserta
 * seluruh perseroan perorangannya); Pasal 58 ayat (2) dan (3) untuk pasangan
 * pisah harta atau istri yang menjalankan kewajiban perpajakannya sendiri; dan
 * UU PPh Pasal 8 ayat (1) untuk pasangan yang melapor gabungan, karena seluruh
 * penghasilan istri dianggap penghasilan suami.
 *
 * Pengecualiannya adalah pasangan yang hidup berpisah berdasarkan putusan hakim
 * (UU PPh Pasal 8 ayat (2) huruf a): keadaan itu tidak disebut dalam PP 20/2026
 * Pasal 58 ayat (2), yang hanya menunjuk huruf b dan huruf c.
 *
 * Seluruh angka memakai Tahun Pajak SEBELUMNYA sesuai Pasal 58 ayat (1) huruf a.
 */
export function hitungOmzetKonsolidasi(profil: ProfilWajibPajak): number {
  const pasanganIkut =
    profil.statusPerpajakanPasangan !== 'TIDAK_ADA_PASANGAN' &&
    profil.statusPerpajakanPasangan !== 'PISAH_PUTUSAN_HAKIM';
  return (
    Math.max(0, profil.omzetPribadiThnSebelumnya) +
    (pasanganIkut ? Math.max(0, profil.omzetPasanganThnSebelumnya) : 0) +
    Math.max(0, profil.omzetSeluruhPerseroanPeroranganThnSebelumnya)
  );
}

function lewatAmbangPphFinal(nilai: number): boolean {
  const ambang = AMBANG.pphFinal.ambangPeredaranBruto;
  return ambang.operator === 'LTE' ? nilai > ambang.nilai : nilai >= ambang.nilai;
}

function memenuhiAmbangNppn(nilai: number): boolean {
  const ambang = AMBANG.nppn.ambangPeredaranBruto;
  return ambang.operator === 'LT' ? nilai < ambang.nilai : nilai <= ambang.nilai;
}

function rupiah(nilai: number): string {
  return `Rp${nilai.toLocaleString('id-ID')}`;
}

// ---------------------------------------------------------------------------
// Saringan PPh Final 0,5%
// ---------------------------------------------------------------------------

/**
 * Saringan pekerjaan bebas.
 *
 * PP 20/2026 Pasal 56 ayat (3) huruf a mengecualikan penghasilan dari jasa
 * sehubungan dengan pekerjaan bebas, dan ayat (4) merinci jenisnya. Penjelasan
 * ayat (4) menegaskan bahwa orang yang menjalankan usaha dan mempekerjakan
 * orang lain tidak lagi memperoleh penghasilan dari pekerjaan bebas, sehingga
 * jawaban pengguna soal cara menjalankan kegiatan ikut menentukan hasil.
 */
function saringPekerjaanBebas(profil: ProfilWajibPajak, klu: EntriKlu): SyaratKelayakan {
  const aturan = ATURAN.pekerjaanBebas;
  const dasar = gabungDasarHukum(aturan.dasarHukum, klu.dasarHukum);
  const buat = (status: StatusKelayakan, alasan: string): SyaratKelayakan => ({
    kode: aturan.kode,
    status,
    alasan,
    dasarHukum: dasar
  });

  if (profil.bentukKegiatan === 'BELUM_PASTI') {
    return buat(
      'PERLU_DIPASTIKAN',
      'Anda belum memastikan apakah penghasilan ini berasal dari keahlian pribadi atau dari usaha. Keduanya diperlakukan berbeda.'
    );
  }

  const menjalankanUsaha =
    profil.bentukKegiatan === 'USAHA_JASA' || profil.bentukKegiatan === 'USAHA_DAGANG';

  if (klu.pekerjaanBebas === 'YA') {
    if (menjalankanUsaha) {
      return buat(
        'PERLU_DIPASTIKAN',
        `${klu.nama} umumnya tergolong pekerjaan bebas (${klu.rujukanPasal56Ayat4 ?? 'Pasal 56 ayat (4)'}). Namun Anda menyatakan menjalankannya sebagai usaha dengan pegawai, dan penghasilan usaha semacam itu bukan penghasilan pekerjaan bebas. Pemisahan keduanya perlu dipastikan ke DJP.`
      );
    }
    return buat(
      'TIDAK_BOLEH',
      `${klu.nama} termasuk jasa sehubungan dengan pekerjaan bebas (${klu.rujukanPasal56Ayat4 ?? 'Pasal 56 ayat (4)'}), sehingga penghasilannya dikecualikan dari PPh Final 0,5%.`
    );
  }

  if (klu.pekerjaanBebas === 'PERLU_DIPASTIKAN') {
    return buat(
      'PERLU_DIPASTIKAN',
      `${klu.nama} tidak disebut satu per satu dalam daftar pekerjaan bebas, tetapi dapat masuk kategori ${klu.rujukanPasal56Ayat4 ?? 'tenaga ahli atau seniman lainnya'}. Statusnya perlu dipastikan ke DJP sebelum memakai tarif 0,5%.`
    );
  }

  if (profil.bentukKegiatan === 'PEKERJAAN_BEBAS') {
    return buat(
      'PERLU_DIPASTIKAN',
      `${klu.nama} tercatat sebagai kegiatan usaha, tetapi Anda menyatakan bekerja sendiri berdasarkan keahlian pribadi. Perbedaan ini menentukan boleh tidaknya tarif 0,5% dan perlu dipastikan ke DJP.`
    );
  }

  return buat('BOLEH', `${klu.nama} tergolong kegiatan usaha, bukan pekerjaan bebas.`);
}

/**
 * Saringan ambang peredaran bruto gabungan.
 *
 * Rujukan: PP 20/2026 Pasal 57 ayat (1) dan ayat (2) huruf e jo. Pasal 58.
 * Ketidakpastian status perpajakan pasangan hanya menghasilkan
 * `PERLU_DIPASTIKAN` bila penggabungan itu benar-benar mengubah vonis.
 */
function saringAmbangKonsolidasi(profil: ProfilWajibPajak): SyaratKelayakan {
  const aturan = ATURAN.ambangKonsolidasi;
  const konsolidasi = hitungOmzetKonsolidasi(profil);
  const ambang = AMBANG.pphFinal.ambangPeredaranBruto.nilai;

  const tanpaPasangan =
    Math.max(0, profil.omzetPribadiThnSebelumnya) +
    Math.max(0, profil.omzetSeluruhPerseroanPeroranganThnSebelumnya);

  const dasarPisah = gabungDasarHukum(
    aturan.dasarHukum,
    ATURAN.penggabunganSuamiIstriPisah.dasarHukum
  );
  const dasarGabung = gabungDasarHukum(
    aturan.dasarHukum,
    ATURAN.penggabunganSuamiIstriGabung.dasarHukum
  );

  const statusPasangan = profil.statusPerpajakanPasangan;
  const penggabunganMengubahVonis =
    lewatAmbangPphFinal(konsolidasi) !== lewatAmbangPphFinal(tanpaPasangan);

  const dasarMenurutStatus =
    statusPasangan === 'GABUNG'
      ? dasarGabung
      : statusPasangan === 'PISAH_HARTA' || statusPasangan === 'PISAH_KEWAJIBAN'
        ? dasarPisah
        : aturan.dasarHukum;

  if (lewatAmbangPphFinal(konsolidasi)) {
    if (statusPasangan === 'TIDAK_YAKIN' && penggabunganMengubahVonis) {
      return {
        kode: aturan.kode,
        status: 'PERLU_DIPASTIKAN',
        alasan: `Tanpa omzet pasangan, peredaran bruto Anda ${rupiah(tanpaPasangan)} masih di bawah batas. Setelah digabung menjadi ${rupiah(konsolidasi)}, batas ${rupiah(ambang)} terlampaui. Karena cara pelaporan Anda dan pasangan belum pasti, hasilnya perlu dipastikan lebih dahulu.`,
        dasarHukum: gabungDasarHukum(dasarGabung, dasarPisah)
      };
    }
    return {
      kode: aturan.kode,
      status: 'TIDAK_BOLEH',
      alasan: `Peredaran bruto gabungan pada tahun pajak sebelumnya ${rupiah(konsolidasi)} melebihi batas ${rupiah(ambang)}.`,
      dasarHukum: dasarMenurutStatus
    };
  }

  return {
    kode: aturan.kode,
    status: 'BOLEH',
    alasan: `Peredaran bruto gabungan pada tahun pajak sebelumnya ${rupiah(konsolidasi)} tidak melebihi batas ${rupiah(ambang)}.`,
    dasarHukum: aturan.dasarHukum
  };
}

/**
 * Saringan pintu satu arah.
 *
 * Rujukan: PP 20/2026 Pasal 57 ayat (2) huruf a jo. ayat (3) dan ayat (4).
 * Wajib Pajak yang pernah memilih tarif Pasal 17 tidak dapat dikenai PPh Final
 * untuk Tahun Pajak-Tahun Pajak berikutnya.
 */
function saringPintuSatuArah(profil: ProfilWajibPajak): SyaratKelayakan {
  const aturan = ATURAN.pintuSatuArahTarifUmum;
  if (profil.pernahPilihTarifUmum === true) {
    return syaratDari(
      aturan,
      'TIDAK_BOLEH',
      'Anda pernah memilih pajak dihitung dari keuntungan bersih (tarif umum Pasal 17). Pilihan itu menutup tarif 0,5% untuk tahun-tahun pajak berikutnya.'
    );
  }
  if (profil.pernahPilihTarifUmum === 'tidak_yakin') {
    return syaratDari(
      aturan,
      'PERLU_DIPASTIKAN',
      'Kami belum tahu apakah Anda pernah memilih tarif umum. Bila pernah, tarif 0,5% tidak dapat dipakai lagi.'
    );
  }
  return syaratDari(aturan, 'BOLEH', 'Anda belum pernah memilih tarif umum Pasal 17.');
}

// ---------------------------------------------------------------------------
// Saringan NPPN
// ---------------------------------------------------------------------------

/** Ambang NPPN memakai peredaran bruto TAHUN PAJAK BERJALAN, kurang dari Rp4,8 miliar. */
function saringAmbangNppn(profil: ProfilWajibPajak): SyaratKelayakan {
  const parameter = AMBANG.nppn.ambangPeredaranBruto;
  const omzet = Math.max(0, profil.omzetPribadiTahunPajak);
  const status: StatusKelayakan = memenuhiAmbangNppn(omzet) ? 'BOLEH' : 'TIDAK_BOLEH';
  return {
    kode: 'AMBANG_NPPN',
    status,
    alasan:
      status === 'BOLEH'
        ? `Uang masuk usaha Anda tahun ini ${rupiah(omzet)}, masih di bawah batas ${rupiah(parameter.nilai)}.`
        : `Uang masuk usaha Anda tahun ini ${rupiah(omzet)} sudah mencapai batas ${rupiah(parameter.nilai)}, sehingga Anda wajib menyelenggarakan pembukuan.`,
    dasarHukum: parameter.dasarHukum
  };
}

/** Pemberitahuan penggunaan Norma wajib disampaikan dalam 3 bulan pertama tahun pajak. */
function saringPemberitahuanNppn(profil: ProfilWajibPajak): SyaratKelayakan {
  const aturan = ATURAN.pemberitahuanNppn;
  const batas = AMBANG.nppn.batasWaktuPemberitahuan;
  if (profil.sudahMemberitahukanNppn === true) {
    return syaratDari(
      aturan,
      'BOLEH',
      `Anda sudah memberitahukan penggunaan Norma (layanan ${batas.layananCoretax} di Coretax).`
    );
  }
  if (profil.sudahMemberitahukanNppn === 'tidak_yakin') {
    return syaratDari(
      aturan,
      'PERLU_DIPASTIKAN',
      `Kami belum tahu apakah pemberitahuan penggunaan Norma sudah Anda sampaikan. Batasnya ${batas.keterangan.toLowerCase()}.`
    );
  }
  return syaratDari(
    aturan,
    'TIDAK_BOLEH',
    `Tanpa pemberitahuan penggunaan Norma (${batas.keterangan.toLowerCase()}), Anda dianggap wajib menyelenggarakan pembukuan.`
  );
}

// ---------------------------------------------------------------------------
// Pemeriksaan utuh
// ---------------------------------------------------------------------------

/**
 * Memeriksa kelayakan tiga skema secara deterministik.
 *
 * Skema yang TIDAK BOLEH tetap dikembalikan agar antarmuka dapat menampilkannya
 * dalam keadaan diredam, bukan disembunyikan.
 */
export function periksaKelayakan(profil: ProfilWajibPajak): HasilPemeriksaanKelayakan {
  const klu = cariKlu(profil.kluKode);
  const peringatan: string[] = [];
  const langkahTindakLanjut: string[] = [];

  const syaratPphFinal: SyaratKelayakan[] = [];
  const syaratNppn: SyaratKelayakan[] = [];

  if (!klu) {
    const alasanKluTidakDikenal =
      'Pekerjaan ini belum ada dalam daftar aturan yang sudah kami verifikasi, sehingga kami tidak memberi vonis pasti.';
    const dasarKluTidakDikenal = ATURAN.pekerjaanBebas.dasarHukum;
    syaratPphFinal.push({
      kode: 'KLU_TIDAK_DIKENAL',
      status: 'PERLU_DIPASTIKAN',
      alasan: alasanKluTidakDikenal,
      dasarHukum: dasarKluTidakDikenal
    });
    syaratNppn.push({
      kode: 'KLU_TIDAK_DIKENAL',
      status: 'PERLU_DIPASTIKAN',
      alasan: alasanKluTidakDikenal,
      dasarHukum: dasarKluTidakDikenal
    });
    langkahTindakLanjut.push(
      'Cocokkan kegiatan dan kode KLU Anda di akun Coretax atau tanyakan ke Kring Pajak 1500200. Jika kegiatan belum tersedia di sini, jangan memilih kategori yang hanya mirip.'
    );
  } else {
    syaratPphFinal.push(saringPekerjaanBebas(profil, klu));
  }

  syaratPphFinal.push(saringAmbangKonsolidasi(profil));
  syaratPphFinal.push(saringPintuSatuArah(profil));

  if (profil.punyaLebihDariSatuKegiatan !== false) {
    syaratPphFinal.push(syaratDari(ATURAN.pekerjaanBebas, 'PERLU_DIPASTIKAN',
      'Daftar ini hanya memeriksa satu kegiatan. Pisahkan omzet usaha, pekerjaan bebas, dan penghasilan final lainnya sebelum memakai tarif 0,5%.'));
  }
  if (profil.pernahMelewatiAmbang !== false) {
    syaratPphFinal.push(syaratDari(ATURAN.pintuSatuArahLewatAmbang, 'PERLU_DIPASTIKAN',
      profil.pernahMelewatiAmbang === true
        ? 'Anda pernah melewati ambang omzet pada tahun yang lebih lama. Tahun kejadian dan aturan peralihannya perlu diperiksa sebelum hak PPh Final dapat dipastikan.'
        : 'Riwayat omzet sebelum tahun pembanding belum dipastikan. Periksa apakah sebelumnya pernah melewati ambang Rp4,8 miliar.'));
  }

  // Pasal II angka 1 huruf f memberi kemungkinan transisi sampai akhir 2026
  // untuk pengecualian baru agregat OP + perseroan. Riwayat PP 55 belum diinput.
  if (profil.tahunPajak === 2026 && lewatAmbangPphFinal(hitungOmzetKonsolidasi(profil)) &&
      !lewatAmbangPphFinal(profil.omzetPribadiThnSebelumnya) &&
      profil.omzetSeluruhPerseroanPeroranganThnSebelumnya > 0) {
    const ambangIndex = syaratPphFinal.findIndex((s) => s.kode === ATURAN.ambangKonsolidasi.kode);
    syaratPphFinal[ambangIndex] = syaratDari(ATURAN.ketentuanPeralihanAgregat2026, 'PERLU_DIPASTIKAN',
      'Agregat omzet dengan perseroan perorangan melewati ambang. Ketentuan peralihan PP 20/2026 Pasal II angka 1 huruf f mungkin berlaku sampai akhir 2026; riwayat fasilitas PP 55/2022 perlu diperiksa.');
  }

  if (profil.tahunPajak === 2025) {
    // Jangan memindahkan saringan baru 2026 menjadi vonis historis 2025.
    syaratPphFinal.splice(0, syaratPphFinal.length, syaratDari(ATURAN.ketentuanPeralihan2025,
      'PERLU_DIPASTIKAN', 'Kelayakan PPh Final tahun 2025 memerlukan aturan historis PP 55/2022 dan riwayat jangka waktu fasilitas. Pemeriksaan ini tidak memberi vonis atau nominal final untuk 2025.'));
  }

  syaratNppn.push(saringAmbangNppn(profil));
  syaratNppn.push(saringPemberitahuanNppn(profil));

  const statusPphFinal = agregasiPrioritas(syaratPphFinal);
  const statusNppn = agregasiPrioritas(syaratNppn);

  const konsolidasi = hitungOmzetKonsolidasi(profil);

  const skema: KelayakanSkema[] = [
    {
      id: 'PPH_FINAL_05',
      statusKelayakan: statusPphFinal,
      syarat: syaratPphFinal,
      alasanKelayakan: syaratPphFinal.map((item) => item.alasan),
      dasarHukum: gabungDasarHukum(
        AMBANG.pphFinal.tarif.dasarHukum,
        ...syaratPphFinal.map((item) => item.dasarHukum)
      ),
      konsekuensiJangkaPanjang:
        statusPphFinal === 'BOLEH'
          ? 'Bila suatu saat Anda memilih tarif umum, hak memakai tarif 0,5% tertutup untuk tahun-tahun pajak berikutnya.'
          : undefined
    },
    {
      id: 'NPPN',
      statusKelayakan: statusNppn,
      syarat: syaratNppn,
      alasanKelayakan: syaratNppn.map((item) => item.alasan),
      dasarHukum: gabungDasarHukum(...syaratNppn.map((item) => item.dasarHukum)),
      konsekuensiJangkaPanjang:
        'Pemberitahuan penggunaan Norma berlaku untuk satu tahun pajak dan perlu disampaikan ulang setiap tahun.'
    },
    {
      id: 'TARIF_UMUM',
      statusKelayakan: 'BOLEH',
      syarat: [
        {
          kode: 'TARIF_UMUM_TERBUKA',
          status: 'BOLEH',
          alasan:
            'Menghitung pajak dari keuntungan bersih berdasarkan pembukuan selalu terbuka bagi setiap Wajib Pajak orang pribadi.',
          dasarHukum: AMBANG.tarifProgresif.dasarHukum
        }
      ],
      alasanKelayakan: [
        'Menghitung pajak dari keuntungan bersih berdasarkan pembukuan selalu terbuka bagi setiap Wajib Pajak orang pribadi.'
      ],
      dasarHukum: gabungDasarHukum(
        AMBANG.tarifProgresif.dasarHukum,
        AMBANG.ptkp.dasarHukum,
        ATURAN.pintuSatuArahTarifUmum.dasarHukum
      ),
      konsekuensiJangkaPanjang:
        statusPphFinal === 'BOLEH'
          ? 'Memilih cara ini menutup tarif 0,5% untuk tahun-tahun pajak berikutnya, dan pilihan itu wajib diberitahukan ke DJP.'
          : undefined
    }
  ];

  // ----- Peringatan -----

  if (profil.tahunPajak === 2025) {
    peringatan.push(ATURAN.ketentuanPeralihan2025.pesan ?? '');
  }

  if (lewatAmbangPphFinal(konsolidasi)) {
    peringatan.push(ATURAN.pintuSatuArahLewatAmbang.pesan ?? '');
  }

  if (profil.jugaPegawaiTetap) {
    peringatan.push(
      'Untuk SPT Tahunan, NPPN dan tarif umum menggabungkan neto gaji yang Anda isi dengan neto usaha. Masukkan kredit PPh 21 gaji pada bukti potong. PPh Final hanya menunjukkan pajak usaha; pajak gaji dan setoran final belum dikurangkan di kartu tersebut.'
    );
  }

  if (profil.punyaLebihDariSatuKegiatan !== false) {
    peringatan.push(
      'Anda punya lebih dari satu jenis kegiatan atau belum yakin. Persentase Norma berbeda untuk tiap kegiatan, sehingga perkiraan Norma tidak dapat dihitung dari satu angka omzet gabungan.'
    );
  }

  if (profil.statusPerpajakanPasangan === 'TIDAK_YAKIN' && profil.omzetPasanganThnSebelumnya > 0) {
    peringatan.push(
      'Omzet pasangan ikut dihitung untuk uji batas Rp4,8 miliar pada hampir semua keadaan. Satu-satunya pengecualian adalah pasangan yang hidup berpisah berdasarkan putusan hakim. Pastikan status Anda.'
    );
  }

  // ----- Langkah tindak lanjut -----

  if (statusNppn === 'PERLU_DIPASTIKAN') {
    langkahTindakLanjut.push(
      `Buka akun Coretax DJP, periksa layanan ${AMBANG.nppn.batasWaktuPemberitahuan.layananCoretax} untuk melihat apakah pemberitahuan Norma sudah pernah Anda sampaikan.`
    );
  }

  if (statusPphFinal === 'PERLU_DIPASTIKAN') {
    langkahTindakLanjut.push(
      'Tanyakan status pekerjaan bebas Anda ke Kring Pajak 1500200 atau KPP terdaftar sebelum memakai tarif 0,5%.'
    );
  }

  if (profil.biayaOperasionalRiil === undefined) {
    langkahTindakLanjut.push(
      'Kumpulkan catatan biaya usaha setahun bila Anda ingin melihat perkiraan pajak dengan cara keuntungan bersih.'
    );
  }

  langkahTindakLanjut.push(
    'Cocokkan hasil ini dengan data di akun Coretax DJP sebelum mengisi SPT Tahunan.'
  );

  return {
    skema,
    peringatan: peringatan.filter((teks) => teks.length > 0),
    langkahTindakLanjut,
    omzetKonsolidasiThnSebelumnya: konsolidasi,
    omzetPribadiThnSebelumnya: Math.max(0, profil.omzetPribadiThnSebelumnya)
  };
}
