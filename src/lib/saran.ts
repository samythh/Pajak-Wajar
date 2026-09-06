import { formatCurrency } from '@/lib/format';
import type { HasilAuditPajak, HasilSkema } from '@/types/pajak';

const nama = {
  PPH_FINAL_05: 'PPh Final UMKM 0,5%',
  NPPN: 'Norma NPPN',
  TARIF_UMUM: 'tarif umum berdasarkan pembukuan'
};

/** Menyusun tindak lanjut dari hasil terverifikasi, tanpa menetapkan hak pajak baru. */
export function susunSaran(hasil: HasilAuditPajak): string[] {
  const saran: string[] = [];
  const terhitung = hasil.skema.filter(s => s.statusKalkulasi === 'TERSEDIA');
  const nppn = hasil.skema.find(s => s.id === 'NPPN');
  const umum = hasil.skema.find(s => s.id === 'TARIF_UMUM');

  if (hasil.rekomendasiHemat) {
    saran.push(`Pertimbangkan ${nama[hasil.rekomendasiHemat.id]}: dari ketiga skema yang boleh dipakai dan sudah dihitung, perkiraannya paling rendah (${formatCurrency(hasil.rekomendasiHemat.pajakTerutang)}). Pastikan persyaratan pencatatan dan riwayat pilihan pajak Anda sesuai; angka terendah bukan satu-satunya pertimbangan.`);
  } else if (nppn?.statusKalkulasi === 'TERSEDIA' && umum?.statusKalkulasi === 'TERSEDIA') {
    const selisih = umum.rincianKalkulasi.pajakSebelumKredit - nppn.rincianKalkulasi.pajakSebelumKredit;
    if (selisih === 0) {
      saran.push('Norma NPPN dan tarif umum menghasilkan pajak sebelum kredit yang sama. Periksa kesesuaian pemberitahuan Norma dan pembukuan Anda sebelum menentukan cara pelaporan.');
    } else {
      saran.push(`Untuk penghasilan nonfinal, pertimbangkan ${nama[selisih > 0 ? 'NPPN' : 'TARIF_UMUM']}: perkiraan pajak sebelum kredit lebih rendah ${formatCurrency(Math.abs(selisih))} dibanding ${nama[selisih > 0 ? 'TARIF_UMUM' : 'NPPN']}. Perbandingan ini hanya mencakup kedua skema tersebut; pastikan pemberitahuan Norma atau pembukuan Anda sesuai sebelum melapor.`);
    }
  } else if (terhitung.length > 0) {
    saran.push(`${terhitung.map(s => nama[s.id]).join(' dan ')} sudah dapat dihitung dari jawaban Anda. Gunakan rinciannya untuk menyiapkan pelaporan; skema yang nominalnya belum tersedia belum dapat dibandingkan.`);
  } else {
    saran.push('Lengkapi bagian yang ditandai belum pasti sebelum memilih skema. Saat ini belum ada nominal yang cukup lengkap untuk dijadikan dasar perbandingan.');
  }

  if (hasil.profil.jugaPegawaiTetap && hasil.profil.penghasilanNetoPegawai === undefined) {
    saran.push('Salin penghasilan neto gaji sebelum PTKP dari bukti potong pegawai, lalu perbarui jawaban agar gabungan gaji dan usaha dapat dihitung.');
  }
  if (!['TIDAK_ADA_PASANGAN', 'PISAH_PUTUSAN_HAKIM'].includes(hasil.profil.statusPerpajakanPasangan)) {
    saran.push('Siapkan data penghasilan neto pasangan dan status pelaporan keluarga. Bawa ringkasan ini ke KPP untuk memeriksa penggabungan penghasilan atau pembagian pajak keluarga.');
  }
  if (hasil.totalKreditBupot > 0) {
    saran.push('Cocokkan nomor, tahun pajak, dan nominal setiap bukti potong dengan Coretax. Pastikan tidak ada bukti ganda atau potongan final yang dimasukkan sebagai kredit nonfinal.');
  }
  const final = hasil.skema.find(s => s.id === 'PPH_FINAL_05');
  if (final?.statusKalkulasi === 'TERSEDIA') {
    saran.push('Untuk PPh Final, cocokkan pajak usaha dengan setoran final yang sudah dibayar. Nominal pada kartu belum dikurangi setoran tersebut.');
  }
  if (hasil.skema.some(adaKelebihanKredit)) {
    saran.push('Periksa selisih kredit yang melebihi perkiraan pajak beserta dokumen pendukungnya sebelum mengisi SPT. Selisih tersebut belum memastikan adanya pengembalian pajak.');
  }
  return [...new Set([...saran, ...hasil.langkahTindakLanjut])];
}

function adaKelebihanKredit(skema: HasilSkema): boolean {
  return skema.statusKalkulasi === 'TERSEDIA' &&
    skema.rincianKalkulasi.skema !== 'PPH_FINAL_05' &&
    skema.rincianKalkulasi.kelebihanKredit > 0;
}
