import { TombolUnduhKertasKerja } from '@/components/berkas/TombolUnduhKertasKerja';
import { formatCurrency, formatPersenNorma, formatTarif } from '@/lib/format';
import type { HasilAuditPajak, HasilSkema, IdSkema, StatusKelayakan } from '@/types/pajak';

const namaSkema: Record<IdSkema, string> = {
  PPH_FINAL_05: 'PPh Final UMKM — pajak 0,5% dari omzet',
  NPPN: 'Norma NPPN — perkiraan penghasilan bersih',
  TARIF_UMUM: 'Tarif umum — berdasarkan keuntungan bersih'
};

const tampilan: Record<StatusKelayakan, { label: string; simbol: string; border: string; text: string }> = {
  BOLEH: { label: 'BOLEH DIPAKAI', simbol: '✓', border: 'border-blue', text: 'text-blue' },
  TIDAK_BOLEH: { label: 'TIDAK BOLEH DIPAKAI', simbol: '×', border: 'border-stamp', text: 'text-stamp' },
  PERLU_DIPASTIKAN: { label: 'PERLU DICEK DULU', simbol: '?', border: 'border-pending', text: 'text-pending' }
};

function BarisHitung({ kunci, nilai, tebal }: { kunci: string; nilai: string; tebal?: boolean }) {
  return (
    <div
      className={`grid grid-cols-1 gap-1 py-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4 ${tebal ? 'mt-1 border-t border-line pt-2 font-semibold' : ''}`}
    >
      <span className={tebal ? '' : 'text-margin'}>{kunci}</span>
      <span className="break-all font-mono tabular-nums sm:text-right">{nilai}</span>
    </div>
  );
}

function Perhitungan({ skema }: { skema: HasilSkema }) {
  if (skema.statusKalkulasi !== 'TERSEDIA') {
    return (
      <p className="mt-5 border-l-2 border-line bg-paper px-4 py-3 text-xs leading-5 text-margin">
        {skema.alasanKalkulasi}
      </p>
    );
  }

  const r = skema.rincianKalkulasi;

  return (
    <div className="mt-5 border border-line bg-paper/70 px-4 py-4 text-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-margin">
        {r.skema === 'PPH_FINAL_05' ? 'Pajak usaha setahun sebelum setoran' : 'Perkiraan sisa pajak setelah kredit'}
      </p>
      <p className="mb-3 break-all font-display text-2xl font-semibold sm:text-3xl">{formatCurrency(r.pajakTerutang)}</p>
      {r.skema === 'PPH_FINAL_05' && <p className="mb-3 text-xs leading-5 text-margin">Belum dikurangi setoran atau potongan pajak final. Kredit nonfinal pada formulir tidak mengurangi angka ini.</p>}
      {r.skema !== 'PPH_FINAL_05' && r.kelebihanKredit > 0 && <p className="mb-3 text-xs leading-5 text-pending">Kredit melebihi perkiraan pajak sebesar {formatCurrency(r.kelebihanKredit)}. Cocokkan selisih ini dalam SPT.</p>}

      <details className="detail-panel group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold">
          <span>Lihat cara menghitungnya</span>
          <span className="font-mono text-base text-margin transition-transform group-open:rotate-45" aria-hidden="true">
            +
          </span>
        </summary>
        <div className="mt-3 text-xs">
          {r.skema === 'PPH_FINAL_05' ? (
            <>
              <BarisHitung kunci="Omzet setahun" nilai={formatCurrency(r.omzetPribadi)} />
              <BarisHitung kunci="Bagian yang dibebaskan" nilai={`− ${formatCurrency(r.batasPembebasan)}`} />
              <BarisHitung kunci="Yang dikenai pajak" nilai={formatCurrency(r.dasarPengenaan)} />
              <BarisHitung kunci={`Tarif ${formatTarif(r.tarif)}`} nilai={formatCurrency(r.pajakTerutang)} tebal />
            </>
          ) : (
            <>
              <BarisHitung kunci="Omzet setahun" nilai={formatCurrency(r.omzetPribadi)} />
              {r.skema === 'TARIF_UMUM' ? (
                <BarisHitung kunci="Biaya usaha" nilai={`− ${formatCurrency(r.biayaOperasional)}`} />
              ) : (
                <BarisHitung
                  kunci={`Norma ${formatPersenNorma(r.persenNorma)} dari omzet`}
                  nilai={formatCurrency(r.penghasilanNetoUsaha)}
                />
              )}
              {r.skema === 'TARIF_UMUM' && (
                <BarisHitung kunci="Penghasilan neto usaha" nilai={formatCurrency(r.penghasilanNetoUsaha)} />
              )}
              {r.penghasilanNetoPegawai > 0 && <><BarisHitung kunci="Penghasilan neto gaji" nilai={formatCurrency(r.penghasilanNetoPegawai)} /><BarisHitung kunci="Total penghasilan neto" nilai={formatCurrency(r.penghasilanNeto)} /></>}
              <BarisHitung kunci="PTKP" nilai={`− ${formatCurrency(r.ptkp)}`} />
              <BarisHitung kunci="PKP (dibulatkan ke bawah ke ribuan)" nilai={formatCurrency(r.pkp)} />
              {r.lapisanTerpakai.map((lapis) => (
                <BarisHitung
                  key={lapis.lapisan}
                  kunci={`Lapisan ${lapis.lapisan}: ${formatCurrency(lapis.bagianPkp)} × ${formatTarif(lapis.tarif)}`}
                  nilai={formatCurrency(lapis.pajakLapisan)}
                />
              ))}
              <BarisHitung kunci="Pajak sebelum kredit" nilai={formatCurrency(r.pajakSebelumKredit)} />
              <BarisHitung kunci="Pajak yang sudah dipotong" nilai={`− ${formatCurrency(r.kreditBupot)}`} />
              <BarisHitung kunci="Masih harus dibayar" nilai={formatCurrency(r.pajakTerutang)} tebal />
            </>
          )}
        </div>
      </details>
    </div>
  );
}

export function KartuVonis({ hasil }: { hasil: HasilAuditPajak }) {
  return (
    <section className="bg-paper p-4 shadow-sheet sm:p-7" aria-labelledby="judul-hasil" aria-live="polite">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue">Hasil pengecekan</p>
          <h2 id="judul-hasil" tabIndex={-1} className="mt-1 font-display text-3xl font-semibold outline-none">
            Cara hitung pajak Anda
          </h2>
        </div>
        <span className="border border-line px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-margin">
          Basis aturan {hasil.versiRegulasi}
        </span>
      </div>

      <div className="space-y-4">
        {hasil.skema.map((item, index) => {
          const ui = tampilan[item.statusKelayakan];
          return (
            <article
              key={item.id}
              className={`motion-result relative min-w-0 border-l-4 ${ui.border} bg-white px-4 py-6 sm:border-l-8 sm:px-7`}
              style={{ animationDelay: `${100 + index * 110}ms` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`motion-status grid h-7 w-7 place-items-center border-2 ${ui.border} ${ui.text} font-mono text-sm font-bold`}
                  style={{ animationDelay: `${260 + index * 110}ms` }}
                  aria-hidden="true"
                >
                  {ui.simbol}
                </span>
                <span className={`text-xs font-bold tracking-[0.14em] ${ui.text}`}>{ui.label}</span>
              </div>

              <h3 className="mt-5 font-display text-2xl font-semibold text-ink sm:text-3xl">
                {namaSkema[item.id]}
              </h3>

              <ul className="mt-3 space-y-2 leading-7 text-margin">
                {item.alasanKelayakan.map((alasan) => (
                  <li key={alasan} className="flex gap-3">
                    <span aria-hidden="true" className="text-line">
                      —
                    </span>
                    <span>{alasan}</span>
                  </li>
                ))}
              </ul>

              <Perhitungan skema={item} />

              {item.konsekuensiJangkaPanjang && (
                <p className="mt-4 flex gap-3 border border-pending/30 bg-amber-50 px-4 py-3 text-sm leading-6">
                  <span className="font-bold text-pending" aria-hidden="true">
                    !
                  </span>
                  <span>{item.konsekuensiJangkaPanjang}</span>
                </p>
              )}

              <details className="detail-panel group mt-5 border-t border-line pt-4 text-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
                  <span>Lihat aturan resminya</span>
                  <span className="font-mono text-lg text-margin transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <ul className="mt-4 space-y-3 border-l border-line pl-4">
                  {item.dasarHukum.map((dasar) => (
                    <li key={`${dasar.namaRegulasi}-${dasar.pasalAtauLampiran}`}>
                      <p className="font-mono text-xs font-semibold">
                        {dasar.namaRegulasi} — {dasar.pasalAtauLampiran}
                        {dasar.statusVerifikasi === 'DALAM_REVIEW' && (
                          <span className="ml-2 border border-pending px-1.5 py-0.5 text-[10px] font-bold uppercase text-pending">
                            masih diperiksa
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-margin">{dasar.fungsi}</p>
                      <a
                        href={dasar.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block break-all font-mono text-[11px] text-blue underline underline-offset-2"
                      >
                        {dasar.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          );
        })}
      </div>

      {hasil.peringatan.length > 0 && (
        <div className="mt-5 space-y-2">
          {hasil.peringatan.map((peringatan) => (
            <p key={peringatan} className="flex gap-3 border border-pending/30 bg-amber-50 p-4 text-sm leading-6">
              <span className="font-bold text-pending" aria-hidden="true">
                !
              </span>
              <span>{peringatan}</span>
            </p>
          ))}
        </div>
      )}

      {hasil.langkahTindakLanjut.length > 0 && (
        <div className="mt-6 bg-ink p-5 text-white">
          <h3 className="text-lg font-semibold">Saran berdasarkan jawaban Anda</h3>
          <p className="mt-1 text-xs leading-5 text-white/70">Pertimbangan skema dan langkah yang dapat Anda lakukan sebelum melapor.</p>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {hasil.langkahTindakLanjut.map((langkah) => (
              <li key={langkah} className="flex gap-3">
                <span className="text-white/50" aria-hidden="true">
                  →
                </span>
                {langkah}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <TombolUnduhKertasKerja hasil={hasil} />
      </div>

      <p className="mt-5 text-xs leading-5 text-margin">
        Ini alat bantu, bukan nasihat pajak. Seluruh angka berasal dari data yang Anda isi sendiri.
        Cocokkan kembali melalui akun Coretax DJP, KPP tempat Anda terdaftar, atau Kring Pajak
        1500200 sebelum mengisi SPT Tahunan.
      </p>
    </section>
  );
}
