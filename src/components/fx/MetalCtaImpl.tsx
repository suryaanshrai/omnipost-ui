import { isMetalFxSupported, MetalFx } from "metal-fx"
import type { ReactElement } from "react"

/**
 * Gold reads closest to the rust/bone palette of the three presets
 * (chromatic, silver, gold); square because nothing in the design is
 * rounded, with a 3px ring so it reads at button scale. `theme` is the
 * surface the metal sits on — the hero's ink button wants `dark`.
 * The wandering halo is off: tuned for dark, it lands on paper as a smudge
 * of shadow, and the design has none. metal-fx paints the button surface on its own wrapper (white in light
 * mode) and clears the child's background, so the ink fill and the rust
 * hover move onto the wrapper.
 */
export default function MetalCtaImpl({ children, theme = "light" }: { children: ReactElement; theme?: "light" | "dark" }) {
  if (!isMetalFxSupported()) return children
  return (
    <MetalFx
      preset="gold"
      theme={theme}
      borderRadius={0}
      ringCssPx={3}
      innerShadow
      disableGlow
      className="!bg-ink !text-page transition-colors duration-300 hover:!bg-rust"
    >
      {children}
    </MetalFx>
  )
}
