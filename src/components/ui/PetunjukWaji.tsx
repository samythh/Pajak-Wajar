import { Maskot, type SuasanaWaji } from '@/components/ui/Maskot';

export function PetunjukWaji({ suasana, judul, pesan }: {
  suasana: SuasanaWaji;
  judul: string;
  pesan: string;
}) {
  return (
    <aside aria-label="Petunjuk Waji" className="waji-guide mb-6 flex items-center gap-3 border border-blue/10 bg-paper/60 p-3 sm:gap-4 sm:p-4">
      <span className="shrink-0 rounded-2xl bg-white p-1">
        <Maskot key={`${suasana}-${judul}`} suasana={suasana} className="w-20 sm:w-24" priority />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue">Waji menemani Anda</p>
        <p className="mt-1 text-sm font-semibold text-ink">{judul}</p>
        <p className="mt-1 text-xs leading-5 text-margin">{pesan}</p>
      </div>
    </aside>
  );
}
