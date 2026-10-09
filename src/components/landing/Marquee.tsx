import { LANDING_PLATFORMS } from "@/lib/platforms"

const PLATFORMS = LANDING_PLATFORMS.map((p) => p.name).join(" · ")

/** Hairline-bounded strip; two identical halves so a -50% translate loops seamlessly. */
export default function Marquee() {
  const half = (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} className="flex shrink-0 items-center">
          <span className="display px-8 text-[26px] whitespace-nowrap italic text-ink">One post, every platform</span>
          <span className="text-rust">✳</span>
          <span className="px-8 text-[11px] font-bold tracking-[0.2em] whitespace-nowrap text-ink-55 uppercase">
            {PLATFORMS}
          </span>
          <span className="text-rust">✳</span>
        </span>
      ))}
    </>
  )

  return (
    <div className="overflow-hidden border-y border-hair py-5" aria-hidden="true">
      <div className="marquee-track flex w-max">
        <div className="flex">{half}</div>
        <div className="flex">{half}</div>
      </div>
    </div>
  )
}
