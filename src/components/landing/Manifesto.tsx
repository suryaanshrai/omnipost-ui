import { Fragment, type CSSProperties } from "react"
import { useReveal } from "@/components/editorial/Reveal"

const TEXT =
  "You write the thought once. OmniPost carries it to every feed you keep, on the hour you choose, and reports back what actually landed."

/**
 * The word-by-word masked reveal: every word sits in its own
 * `overflow:hidden` mask and rises from translateY(112%) once the block
 * scrolls into view, staggered 42ms per word (CSS: `.manifesto`).
 *
 * Screen readers get the sentence once, as text; the animated words are
 * hidden from them. (An aria-label on a <p> isn't reliably read.)
 */
export default function Manifesto() {
  const ref = useReveal<HTMLParagraphElement>({ threshold: 0.25 })
  const words = TEXT.split(" ")

  return (
    <section id="product" className="px-4 py-24 sm:px-10 sm:py-36 lg:pl-[108px]">
      <p ref={ref} className="manifesto display max-w-[1180px] text-[clamp(30px,4.3vw,62px)] leading-[1.12] text-ink">
        <span className="sr-only">{TEXT}</span>
        {words.map((word, i) => (
          <Fragment key={i}>
            <span aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <span className="manifesto-word inline-block" style={{ "--i": i } as CSSProperties}>
                {word === "once." || word === "landed." ? <em className="text-rust italic">{word}</em> : word}
              </span>
            </span>
            {/* The space between masks, as text: a space at the end of an
                inline-block collapses, and this is where lines may break. */}
            {i < words.length - 1 && " "}
          </Fragment>
        ))}
      </p>
    </section>
  )
}
