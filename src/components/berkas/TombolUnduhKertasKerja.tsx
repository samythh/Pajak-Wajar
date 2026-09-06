'use client';

import { useState } from 'react';
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

  const buatBerkas = async () => {
    setSedangMembuat(true);
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
        className="pressable w-full border border-line bg-white px-5 py-3.5 text-sm font-semibold hover:border-blue disabled:cursor-progress disabled:opacity-60"
      >
        {sedangMembuat ? 'Menyiapkan berkas…' : 'Simpan ringkasan sebagai PDF'}
      </button>
      <p aria-live="polite" className="mt-2 text-xs leading-5 text-margin">
        {galat ?? 'Berkas dibuat di perangkat Anda dan tidak dikirim ke mana pun.'}
      </p>
    </div>
  );
}
