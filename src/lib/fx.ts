import { createContext, useContext, useEffect, useSyncExternalStore } from "react"
import { useTheme } from "@/components/theme-provider"

// The bridge between the editorial palette and the libraries.dev effect
// packages (border-beam, thinking-orbs, liquid-gooey, metal-fx, img-fx).
// They want resolved colour strings and an explicit "dark" | "light", and
// their own `auto` modes don't track this app: border-beam and metal-fx read
// prefers-color-scheme rather than the `.dark` class, and the landing page
// is Day even while <html> carries `.dark`. So every effect wrapper in
// components/fx asks this file instead.

export type FxTheme = "light" | "dark"

export type FxPalette = {
  accent: string
  ember: string
  ink: string
  page: string
  hair: string
  ink38: string
}

/** Mirrors index.css `:root` (Day) and `.dark` (Night). Keep them in step. */
export const FX_PALETTE: Record<FxTheme, FxPalette> = {
  light: {
    accent: "#C4501E",
    ember: "#E0602A",
    ink: "#12100E",
    page: "#EAE3D7",
    hair: "#CCC5BB",
    ink38: "#98938A",
  },
  dark: {
    accent: "#E0602A",
    ember: "#C4501E",
    ink: "#EAE3D7",
    page: "#14110D",
    hair: "#36332D",
    ink38: "#65615A",
  },
}

/**
 * Pins the effect theme for a subtree, independent of the app's Day/Night
 * toggle — the landing page (`light`) and its #14110D bands (`dark`).
 * Provided by components/fx/FxScope.
 */
export const FxScopeContext = createContext<FxTheme | null>(null)

/** The theme an effect should render for: the nearest FxScope, else the app toggle. */
export function useFxTheme(): FxTheme {
  const scoped = useContext(FxScopeContext)
  const { theme } = useTheme()
  return scoped ?? (theme === "dark" ? "dark" : "light")
}

export function useFxPalette(): FxPalette {
  return FX_PALETTE[useFxTheme()]
}

const REDUCED = "(prefers-reduced-motion: reduce)"

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

/**
 * border-beam's rotating types don't honour reduced motion on their own, so
 * the Beam wrapper switches itself off with this.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false
  )
}

// Effects pause while a modal covers them. The design's modal overlay is a
// full-screen backdrop blur, and anything still animating underneath makes
// the browser re-blur the whole screen every frame — so beams and orbs
// behind an open modal hold still, and those inside it keep going.
let openOverlays = 0
const overlayListeners = new Set<() => void>()
function emitOverlays() {
  overlayListeners.forEach((l) => l())
}
function subscribeOverlays(cb: () => void) {
  overlayListeners.add(cb)
  return () => {
    overlayListeners.delete(cb)
  }
}

/** Registers an open modal for as long as `open` is true. */
export function useOverlayOpen(open: boolean) {
  useEffect(() => {
    if (!open) return
    openOverlays++
    emitOverlays()
    return () => {
      openOverlays--
      emitOverlays()
    }
  }, [open])
}

/** True inside a modal's content — effects there aren't covered by it. */
export const FxOverlayContext = createContext(false)

/** Whether an effect should hold still because a modal covers it. */
export function useFxSuspended(): boolean {
  const inOverlay = useContext(FxOverlayContext)
  const open = useSyncExternalStore(subscribeOverlays, () => openOverlays, () => 0)
  return open > 0 && !inOverlay
}

let softwareGL: boolean | undefined

/**
 * True when WebGL is missing or runs on a CPU rasteriser (SwiftShader,
 * llvmpipe, Microsoft Basic Render). img-fx's full-card shader takes
 * seconds per frame there and blocks the page, so it falls back to a
 * static stand-in. Probed once, with the probe context released at once
 * (browsers cap live WebGL contexts at ~16).
 */
export function isSoftwareGL(): boolean {
  if (softwareGL !== undefined) return softwareGL
  try {
    const canvas = document.createElement("canvas")
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null
    if (!gl) return (softwareGL = true)
    const info = gl.getExtension("WEBGL_debug_renderer_info")
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ""
    softwareGL = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)
    gl.getExtension("WEBGL_lose_context")?.loseContext()
  } catch {
    softwareGL = true
  }
  return softwareGL
}
