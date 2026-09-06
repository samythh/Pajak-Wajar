'use client';

import { useState } from 'react';
import { IkonStatus } from '@/components/ui/StatusProses';
import type { HasilAuditPajak } from '@/types/pajak';

/**
 * Tombol pembuat kertas kerja PDF.
 *
 * Pustaka PDF dimuat hanya saat tombol ditekan supaya halaman utama tetap
 * ringan, dan berkas dibuat sepenuhnya di peramban sehingga angka finansial
 * tidak pernah dikirim ke server.
 */
export function TombolUnduhKertasKerja({ hasil }: { hasil: HasilAuditPajak }) {
  const [sedangMembuat, setSedangMembuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [selesai, setSelesai] = useState(false);

  const buatBerkas = async () => {
    setSedangMembuat(true);
    setSelesai(false);
    setGalat(null);
    try {
      const [{ pdf }, { KertasKerjaPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./KertasKerjaPdf')
      ]);
      const blob = await pdf(<KertasKerjaPdf hasil={hasil} />).toBlob();
      const url = URL.createObjectURL(blob);
      const tautan = document.createElement('a');
      tautan.href = url;
      tautan.download = `kertas-kerja-pajakwajar-${hasil.profil.tahunPajak}.pdf`;
      document.body.appendChild(tautan);
      tautan.click();
      document.body.removeChild(tautan);
      setSelesai(true);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setGalat('Berkas gagal dibuat di peramban ini. Coba lagi, atau salin angkanya dari layar.');
    } finally {
      setSedangMembuat(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={buatBerkas}
        disabled={sedangMembuat}
        aria-busy={sedangMembuat}
        className={`pressable relative flex w-full items-center justify-center gap-3 overflow-hidden border px-5 py-3.5 text-sm font-semibold hover:border-blue disabled:cursor-progress ${sedangMembuat ? 'busy-sheen border-blue/30 bg-blue/5 text-blue' : selesai ? 'border-blue/40 bg-blue/5 text-blue' : 'border-line bg-white'}`}
      >
        {(sedangMembuat || selesai) && <IkonStatus key={selesai ? 'selesai' : 'proses'} sukses={selesai} />}
        {sedangMembuat ? 'Menyiapkan berkas…' : 'Simpan ringkasan sebagai PDF'}
      </button>
      <p aria-live="polite" className="mt-2 text-xs leading-5 text-margin">
        {galat ?? (selesai ? 'PDF siap. Permintaan unduhan telah dikirim ke browser Anda.' : sedangMembuat ? 'Menyusun halaman dan rincian pajak di perangkat Anda…' : 'Berkas dibuat di perangkat Anda dan tidak dikirim ke mana pun.')}
      </p>
    </div>
  );
}
