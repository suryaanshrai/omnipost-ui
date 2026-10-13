import { ThinkingOrb } from "thinking-orbs"
import type { OrbState } from "thinking-orbs"
import { useFxPalette, useFxSuspended, useFxTheme } from "@/lib/fx"

export type { OrbState }

/**
 * libraries.dev's thinking orb in the editorial accent: a dotted 2D-canvas
 * sphere whose animation names what's happening (searching, composing, …).
 * `tone="ink"` for the stock monochrome, or pass any `color` (e.g. the page
 * colour on an ink button).
 */
export default function Orb({
  state = "working",
  size = 20,
  tone = "accent",
  color,
  label,
  className,
}: {
  state?: OrbState
  size?: 20 | 32 | 64
  tone?: "accent" | "ink"
  color?: string
  label?: string
  className?: string
}) {
  const theme = useFxTheme()
  const palette = useFxPalette()
  const suspended = useFxSuspended()
  return (
    <ThinkingOrb
      state={state}
      size={size}
      theme={theme}
      paused={suspended}
      color={color ?? (tone === "accent" ? palette.accent : palette.ink)}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
    />
  )
}
