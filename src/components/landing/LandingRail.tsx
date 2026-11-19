import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { id: "top", num: "01", label: "Intro" },
  { id: "craft", num: "02", label: "Craft" },
  { id: "flow", num: "03", label: "Flow" },
  { id: "platforms", num: "04", label: "Platforms" },
  { id: "pricing", num: "05", label: "Pricing" },
]

/**
 * The fixed left rail: a 56px progress line whose rust fill tracks page
 * scroll, then the five section labels set vertical-rl. A section is
 * "active" once its top has crossed 45% of the viewport. Hidden under
 * 1024px, where there's no gutter to put it in.
 *
 * The fill is a CSS scroll-driven animation (`.rail-progress`) where
 * supported, so it costs no JavaScript at all while scrolling; elsewhere a
 * frame-throttled listener writes the same scale. The active label is
 * worked out only when a section crosses the 45% line (an
 * IntersectionObserver), not on every scroll frame.
 */
export default function LandingRail() {
  const fill = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState("top")

  useEffect(() => {
    const pick = () => {
      let current = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) current = s.id
      }
      setActive(current)
    }
    pick()
    // The top 45% of the viewport: a section's top entering or leaving it is
    // exactly when the active label can change.
    const crossing = new IntersectionObserver(pick, { rootMargin: "0px 0px -55% 0px" })
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) crossing.observe(el)
    }
    return () => crossing.disconnect()
  }, [])

  useEffect(() => {
    if (CSS.supports("animation-timeline: scroll()")) return
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      fill.current?.style.setProperty("--rail-progress", String(max > 0 ? Math.min(1, window.scrollY / max) : 0))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return (
    <aside
      aria-label="Sections"
      className="fixed top-1/2 left-10 z-[250] hidden -translate-y-1/2 flex-col items-center gap-7 lg:flex"
    >
      <div className="relative h-14 w-px bg-hair" aria-hidden="true">
        <div ref={fill} className="rail-progress absolute inset-0 bg-rust" />
      </div>
      <ul className="flex flex-col items-center gap-6">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 text-[9.5px] font-bold tracking-[0.22em] uppercase transition-colors duration-300 [writing-mode:vertical-rl]",
                active === s.id ? "text-rust" : "text-ink-38 hover:text-ink"
              )}
            >
              <span>{s.num}</span>
              <span>{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}
