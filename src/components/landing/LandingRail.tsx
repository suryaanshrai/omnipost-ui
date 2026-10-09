import { useEffect, useState } from "react"
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
 */
export default function LandingRail() {
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState("top")

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      let current = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) current = s.id
      }
      setActive(current)
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
        <div className="absolute top-0 left-0 w-px bg-rust" style={{ height: `${progress * 100}%` }} />
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
