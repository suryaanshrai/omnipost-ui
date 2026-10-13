import { BorderBeam, type BorderBeamProps } from "border-beam"
import { useLayoutEffect, useRef } from "react"
import { useFxPalette, useFxSuspended, useFxTheme, useReducedMotion, type FxPalette } from "@/lib/fx"
import { cn } from "@/lib/utils"

export type BeamProps = Omit<BorderBeamProps, "colorVariant" | "theme"> & {
  /** `accent` = rust on Day / ember on Night; `ink` = the monochrome beam. */
  tone?: "accent" | "ink"
  /**
   * What the beam glows against. `page` (default) is paper on Day; `ink`
   * is for beams on an ink block (primary buttons) — the opposite tone, so
   * the beam is tuned for a dark surface on Day and a light one on Night.
   */
  surface?: "page" | "ink"
  /**
   * Draw the beam as a layer over the children instead of wrapping them.
   * Needed when the children hold beams of their own (fields, buttons):
   * border-beam's rules use descendant selectors, so a wrapping beam would
   * light up every beam nested inside it.
   */
  overlay?: boolean
}

const PULSE = new Set(["pulse-inner", "pulse-outside"])
// The r, g, b of an rgb()/rgba() literal; the alpha (a number or a var()) is left in place.
const COLOR = /(rgba?\()\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?=[,)])/g

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Maps every warm colour literal in border-beam's generated stylesheet onto
 * the palette — the deeper reds onto the accent, the lighter ambers onto
 * ember — keeping each one's alpha. Neutral literals (hairlines, shadows,
 * mask whites) are left alone.
 */
function recolor(css: string, p: FxPalette): string {
  const accent = rgb(p.accent)
  const ember = rgb(p.ember)
  return css.replace(COLOR, (m, fn: string, r: string, g: string, b: string) => {
    const [R, G, B] = [+r, +g, +b]
    if (R - B < 60 || R < 120) return m
    const [tr, tg, tb] = G / R > 0.5 ? ember : accent
    return `${fn}${tr}, ${tg}, ${tb}`
  })
}

/**
 * libraries.dev's border-beam in the editorial accent. The library has no
 * custom-colour prop — only fixed palettes — so this renders its `sunset`
 * palette (reds to ambers) and rewrites the colours in the stylesheet it
 * generates inline, so every layer glows in exact rust/ember. Pulse types
 * otherwise cycle the full 360° of hue, so they run with static colours;
 * rotating types keep a narrow shimmer. Square corners unless
 * `borderRadius` says otherwise; off under prefers-reduced-motion and
 * behind an open modal.
 */
export default function Beam({
  tone = "accent",
  surface = "page",
  overlay = false,
  size = "md",
  active = true,
  hueRange,
  saturation,
  brightness,
  children,
  className,
  style,
  ...props
}: BeamProps) {
  const pageTheme = useFxTheme()
  const palette = useFxPalette()
  const reduced = useReducedMotion()
  const suspended = useFxSuspended()
  const ref = useRef<HTMLDivElement>(null)
  const theme = surface === "ink" ? (pageTheme === "dark" ? "light" : "dark") : pageTheme
  const ink = tone === "ink"
  const pulse = PULSE.has(size)

  // Recolour after every render (the library regenerates its <style> — the
  // sibling just before the wrapper — when props change) and on any
  // mutation in between.
  useLayoutEffect(() => {
    const style = ref.current?.previousElementSibling
    if (!(style instanceof HTMLStyleElement) || ink) return
    const apply = () => {
      const text = style.textContent ?? ""
      const next = recolor(text, palette)
      if (next !== text) style.textContent = next
    }
    apply()
    const mo = new MutationObserver(apply)
    mo.observe(style, { childList: true, characterData: true, subtree: true })
    return () => mo.disconnect()
  })

  const beam = (
    <BorderBeam
      ref={ref}
      size={size}
      colorVariant={ink ? "mono" : "sunset"}
      theme={theme}
      borderRadius={0}
      staticColors={pulse}
      hueRange={hueRange ?? (ink ? 0 : 6)}
      saturation={saturation ?? 1}
      brightness={brightness ?? (pageTheme === "dark" ? 1.1 : 1)}
      active={active && !reduced && !suspended}
      className={overlay ? "pointer-events-none !absolute inset-0" : className}
      style={overlay ? undefined : style}
      {...props}
    >
      {overlay ? <div className="h-full w-full" /> : children}
    </BorderBeam>
  )
  if (!overlay) return beam
  return (
    <div className={cn("relative", className)} style={style}>
      {children}
      {beam}
    </div>
  )
}
