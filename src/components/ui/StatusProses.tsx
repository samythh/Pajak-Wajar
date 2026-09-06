/** Ikon dekoratif; status proses selalu disertai teks yang dapat dibaca. */
export function IkonStatus({ sukses = false, besar = false }: { sukses?: boolean; besar?: boolean }) {
  return (
    <span className={`status-orbit ${besar ? 'h-16 w-16' : 'h-6 w-6'} ${sukses ? 'status-success' : 'status-loading'}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" opacity=".16" />
        {sukses ? <>
          <circle className="check-ring" cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" pathLength="1" />
          <path className="check-stroke" d="m14 24 7 7 14-14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
        </> : <circle className="loading-orbit" cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="38 88" />}
      </svg>
    </span>
  );
}

export function PanelProses({ judul, keterangan }: { judul: string; keterangan: string }) {
  return (
    <div role="status" className="motion-page process-panel relative overflow-hidden border border-blue/15 bg-white p-6 text-center sm:p-10">
      <div className="scan-document mx-auto mb-6" aria-hidden="true">
        <span className="scan-line" />
        <span className="block h-2 w-8 rounded bg-blue/25" />
        <span className="mt-5 block h-1.5 w-full rounded bg-blue/15" />
        <span className="mt-3 block h-1.5 w-3/4 rounded bg-blue/15" />
        <span className="mt-3 block h-1.5 w-full rounded bg-blue/15" />
        <span className="absolute -bottom-3 -right-3 rounded-full bg-white text-blue"><IkonStatus besar /></span>
      </div>
      <p className="font-display text-2xl font-semibold text-ink">{judul}</p>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-margin">{keterangan}</p>
      <span className="loading-dots mt-5 inline-flex gap-1.5 text-blue" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}
