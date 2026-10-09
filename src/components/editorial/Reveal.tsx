import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

/**
 * The scroll-reveal motif from Landing Page v2.dc.html: elements sit at
 * `opacity:0; translateY(22px)` until they cross the viewport, then ease in,
 * staggered by position among their siblings. The design does this with one
 * shared IntersectionObserver walking `[data-reveal]` nodes and a manual
 * `transitionDelay` write per element; this hook is the same idea through
 * React state instead of direct DOM mutation, so ordinary components stay in
 * control of their own markup.
 *
 * `disconnect()`s itself the first time an element becomes visible — reveals
 * play once, matching the source.
 */
export function useReveal<T extends HTMLElement>(options?: { rootMargin?: string; threshold?: number }) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // prefers-reduced-motion: show immediately rather than animating in.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: options?.threshold ?? 0.12, rootMargin: options?.rootMargin ?? "0px 0px -50px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options is meant to be passed once, not re-observed on every render
  }, [])

  return { ref, visible }
}

/**
 * Wraps `useReveal` for the common case: a block that fades/rises in once,
 * staggered by `delayMs` (the design staggers list rows by 70ms per sibling
 * index — pass `index * 70` from a `.map()`).
 */
export default function Reveal({
  delayMs = 0,
  className,
  children,
}: {
  delayMs?: number
  className?: string
  children: ReactNode
}) {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: `opacity .9s cubic-bezier(.16,1,.3,1) ${delayMs}ms, transform .8s cubic-bezier(.16,1,.3,1) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  )
}
