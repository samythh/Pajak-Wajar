import Image from 'next/image';

/** Ilustrasi pendamping; informasi proses tetap disampaikan melalui teks. */
export function Maskot({
  suasana = 'menyapa',
  className = 'w-28',
  priority = false
}: {
  suasana?: 'menyapa' | 'memproses' | 'selesai';
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`mascot mascot-${suasana} relative block aspect-square shrink-0 ${className}`} aria-hidden="true">
      <Image
        src="/mascot/waji.webp"
        alt=""
        fill
        sizes="160px"
        priority={priority}
        className="object-contain"
      />
    </span>
  );
}
