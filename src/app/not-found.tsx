import Link from 'next/link';
import { Maskot } from '@/components/ui/Maskot';

export default function NotFound() {
  return (
    <main id="utama" className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-lg border border-line bg-white p-6 text-center shadow-sheet sm:p-10">
        <Maskot suasana="berpikir" className="mx-auto w-40" priority />
        <p className="mt-6 font-mono text-xs font-semibold tracking-widest text-blue">404 · PAJAKWAJAR</p>
        <h1 className="mt-3 font-display text-3xl font-semibold">Sepertinya kita salah alamat.</h1>
        <p className="mt-3 text-sm leading-6 text-margin">Halaman ini tidak ditemukan. Waji bisa menemani Anda kembali ke beranda atau mulai mengecek pajak.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="pressable border border-line px-5 py-3 text-sm font-semibold">Kembali ke beranda</Link>
          <Link href="/cek-kelayakan" className="pressable bg-blue px-5 py-3 text-sm font-semibold text-white">Cek pajak saya</Link>
        </div>
      </section>
    </main>
  );
}
