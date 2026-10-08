import SectionHeader from "@/components/editorial/SectionHeader"

/** Holds a nav slot until its screen lands, so every sidebar link resolves. */
export default function Placeholder({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-[760px]">
      <SectionHeader eyebrow={eyebrow} title={title} />
      <p className="mt-8 text-[15px] text-ink-55">This screen is on its way.</p>
    </div>
  )
}
