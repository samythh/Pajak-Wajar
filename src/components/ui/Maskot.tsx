import Image from 'next/image';

const gambarPose = {
  menyapa: 'waji.webp',
  berpikir: 'waji-berpikir.webp',
  memberitahu: 'waji-memberitahu.webp',
  memeriksa: 'waji-memeriksa.webp',
  memproses: 'waji-memeriksa.webp',
  selesai: 'waji-selesai.webp'
} as const;

export type SuasanaWaji = keyof typeof gambarPose;

/** Ilustrasi pendamping; informasi proses tetap disampaikan melalui teks. */
export function Maskot({
  suasana = 'menyapa',
  className = 'w-28',
  priority = false
}: {
  suasana?: SuasanaWaji;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span data-pose={suasana} className={`mascot mascot-${suasana} relative block aspect-square shrink-0 ${className}`} aria-hidden="true">
      <Image
        src={`/mascot/${gambarPose[suasana]}`}
        alt=""
        fill
        sizes="160px"
        priority={priority}
        className="object-contain"
      />
    </span>
  );
}
