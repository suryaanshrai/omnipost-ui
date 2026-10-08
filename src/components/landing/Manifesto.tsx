import { useReveal } from "@/components/editorial/Reveal"

const TEXT =
  "You write the thought once. OmniPost carries it to every feed you keep, on the hour you choose, and reports back what actually landed."

/**
 * The word-by-word masked reveal: every word sits in its own
 * `overflow:hidden` mask and rises from translateY(112%) once the block
 * scrolls into view, staggered 42ms per word.
 */
export default function Manifesto() {
  const { ref, visible } = useReveal<HTMLParagraphElement>({ threshold: 0.25 })
  const words = TEXT.split(" ")

  return (
    <section id="product" className="px-4 py-24 sm:px-10 sm:py-36 lg:pl-[108px]">
      <p
        ref={ref}
        aria-label={TEXT}
        className="display max-w-[1180px] text-[clamp(30px,4.3vw,62px)] leading-[1.12] text-ink"
      >
        {words.map((word, i) => (
          <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <span
              className="inline-block"
              style={{
                transform: visible ? "translateY(0)" : "translateY(112%)",
                transition: `transform .9s cubic-bezier(.16,1,.3,1) ${i * 42}ms`,
              }}
            >
              {word === "once." || word === "landed." ? <em className="text-rust italic">{word}</em> : word}
              {i < words.length - 1 ? " " : ""}
            </span>
          </span>
        ))}
      </p>
    </section>
  )
}
