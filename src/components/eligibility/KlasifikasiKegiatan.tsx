import type { EntriKlu } from '@/lib/regulasi';

/** Pisahkan rujukan klasifikasi dari kode yang dipakai mengambil Norma. */
export function KlasifikasiKegiatan({ klu }: { klu: EntriKlu }) {
  const pemetaan = klu.pemetaanKbli2020;
  return (
    <div className="mt-4 border border-blue/20 bg-white p-4 text-xs leading-5">
      <p className="font-semibold text-ink">Pastikan kegiatan Anda sesuai</p>
      <p className="mt-1 text-margin">{pemetaan.catatan}</p>
      <details className="detail-panel mt-3">
        <summary className="cursor-pointer font-semibold text-blue">Lihat kode rujukan KLU dan KBLI 2020</summary>
        <div className="mt-3 space-y-3 text-margin">
          <p><strong className="text-ink">KLU lampiran Norma: {klu.kluKode}</strong><br />{klu.uraianLampiran}</p>
          <div>
            <p className="font-semibold text-ink">Padanan kegiatan pada KBLI 2020</p>
            <ul className="mt-2 space-y-2">
              {pemetaan.padanan.map((item) => <li key={item.kode} className="flex items-start gap-2">
                <span className="shrink-0 font-mono text-blue">{item.kode}</span>
                <a className="underline underline-offset-2" href={`${pemetaan.sumberKbli}#page=${item.halamanPdf}`} target="_blank" rel="noopener noreferrer">{item.nama}</a>
              </li>)}
            </ul>
          </div>
          <p>{pemetaan.hubungan === 'BEBERAPA_PADANAN' ? 'Ada beberapa padanan dengan cakupan berbeda. ' : ''}Daftar ini merupakan rujukan kegiatan, bukan penetapan kode usaha Anda atau pemberian Norma otomatis untuk setiap kode KBLI.</p>
          <p>Versi yang dicocokkan adalah KBLI 2020. KBLI 2025 sudah diterbitkan; kode pada layanan yang telah beralih perlu diperiksa sesuai versinya. Persentase Norma di sini tetap merujuk Lampiran I PER-17/PJ/2015.</p>
        </div>
      </details>
    </div>
  );
}
