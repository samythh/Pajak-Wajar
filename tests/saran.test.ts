import { describe, expect, it } from 'vitest';
import { auditPajakMandiri } from '../src/lib/index';
import { contohInput, profilPedagang } from '../src/mock/hasilKelayakan';

describe('saran akhir berdasarkan jawaban', () => {
  it('memberi kreator perbandingan NPPN dan tarif umum dengan basis setara', () => {
    const hasil = auditPajakMandiri(contohInput);
    expect(hasil.langkahTindakLanjut[0]).toContain('pertimbangkan Norma NPPN');
    expect(hasil.langkahTindakLanjut[0]).toContain('Rp19.350.000');
    expect(hasil.langkahTindakLanjut[0]).toContain('sebelum kredit');
    expect(hasil.langkahTindakLanjut.some(s => s.includes('nomor, tahun pajak'))).toBe(true);
  });
  it('menyebut final hanya ketika ketiga skema dapat dibandingkan', () => {
    const hasil = auditPajakMandiri({ profil: profilPedagang, kreditPajak: [] });
    expect(hasil.langkahTindakLanjut[0]).toContain('Pertimbangkan PPh Final');
    expect(hasil.langkahTindakLanjut.some(s => s.includes('setoran final yang sudah dibayar'))).toBe(true);
  });
  it('tidak menyarankan Norma ketika pemberitahuannya belum pasti', () => {
    const hasil = auditPajakMandiri({ ...contohInput, profil: { ...contohInput.profil, sudahMemberitahukanNppn: 'tidak_yakin' } });
    expect(hasil.langkahTindakLanjut[0]).toContain('tarif umum berdasarkan pembukuan sudah dapat dihitung');
    expect(hasil.langkahTindakLanjut[0]).not.toContain('pertimbangkan Norma');
  });
  it('meminta data keluarga ketika belum ada perhitungan yang tersedia', () => {
    const hasil = auditPajakMandiri({ ...contohInput, profil: { ...contohInput.profil, statusPerpajakanPasangan: 'PISAH_HARTA' } });
    expect(hasil.langkahTindakLanjut[0]).toContain('belum ada nominal');
    expect(hasil.langkahTindakLanjut.some(s => s.includes('penghasilan neto pasangan'))).toBe(true);
  });
  it('tidak membuat peringkat semu ketika pajak kedua skema sama', () => {
    const hasil = auditPajakMandiri({ ...contohInput, profil: { ...contohInput.profil, biayaOperasionalRiil: 210_000_000 } });
    expect(hasil.langkahTindakLanjut[0]).toContain('pajak sebelum kredit yang sama');
  });
});
