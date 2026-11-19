import { useEffect, useRef } from "react"
import type { CSSProperties, ReactNode } from "react"

/**
 * The scroll-reveal motif from Landing Page v2.dc.html: elements rise and
 * fade in once as they cross into view, staggered among their siblings.
 *
 * One IntersectionObserver is shared by every revealed element (the design
 * did the same), and it only flips a `data-revealed` attribute: the motion
 * itself is CSS (index.css, `[data-reveal]`). So:
 *   - with reduced motion the hidden starting state never applies, and
 *     the content is simply there (it used to paint hidden, then fade);
 *   - nothing re-renders React on scroll;
 *   - printing shows everything.
 * Plays once, as the design specifies, rather than scrubbing with scroll.
 */

const callbacks = new WeakMap<Element, () => void>()
let shared: IntersectionObserver | null = null

function observe(el: Element, onVisible: () => void, threshold?: number): () => void {
  if (typeof IntersectionObserver === "undefined") {
    onVisible()
    return () => {}
  }
  // A custom threshold (the manifesto's 25%) gets an observer of its own.
  if (threshold !== undefined) {
    const own = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible()
          own.disconnect()
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    )
    own.observe(el)
    return () => own.disconnect()
  }
  shared ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        callbacks.get(entry.target)?.()
        callbacks.delete(entry.target)
        shared?.unobserve(entry.target)
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
  )
  callbacks.set(el, onVisible)
  shared.observe(el)
  return () => {
    callbacks.delete(el)
    shared?.unobserve(el)
  }
}

/** Marks the element `data-revealed` the first time it scrolls into view. */
export function useReveal<T extends HTMLElement>(options?: { threshold?: number }) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    return observe(el, () => el.setAttribute("data-revealed", ""), options?.threshold)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options is meant to be passed once, not re-observed on every render
  }, [])
  return ref
}

/**
 * A block that fades/rises in once, staggered by `delayMs` (the design
 * staggers list rows by 70ms per sibling index: pass `index * 70`).
 */
export default function Reveal({ delayMs = 0, className, children }: { delayMs?: number; className?: string; children: ReactNode }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} data-reveal="" className={className} style={{ "--reveal-delay": `${delayMs}ms` } as CSSProperties}>
      {children}
    </div>
  )
}
