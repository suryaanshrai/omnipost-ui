import { ImageGeneration, type ImageGenerationHandle } from "img-fx"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { useFxPalette, useFxTheme } from "@/lib/fx"
import { cn } from "@/lib/utils"

export type GeneratingImageHandle = {
  /** Dissolve the mosaic into `src` and hold it there. */
  reveal: (src: string) => void
  /** Back to the generating mosaic. */
  hide: () => void
}

export type GeneratingImageProps = {
  /** When set, reveals as soon as the effect is ready (an existing image loading in). */
  src?: string
  preset?: "pixels-organic" | "pixels-mechanic" | "sweep-gradient"
  /** Sizes the card; the shader fills it. */
  className?: string
  style?: CSSProperties
}

/**
 * img-fx's WebGL "image generation" loader, tinted to the paper palette:
 * the mosaic runs page → hair → ink-38 → rust → ember instead of the stock
 * chromatic colours, on a page-coloured card with square corners. Once an
 * image has fully dissolved in, the WebGL card is swapped for a plain
 * <img> — the shader only runs while there's something to show.
 */
const GeneratingImageImpl = forwardRef<GeneratingImageHandle, GeneratingImageProps>(function GeneratingImageImpl(
  { src, preset = "pixels-organic", className, style },
  ref
) {
  const theme = useFxTheme()
  const p = useFxPalette()
  const inner = useRef<ImageGenerationHandle>(null)
  const [pool, setPool] = useState<string[]>(src ? [src] : [])
  const [settled, setSettled] = useState<string | null>(null)
  const colors = useMemo(() => [p.page, p.hair, p.ink38, p.accent, p.ember, p.hair, p.accent], [p])

  useImperativeHandle(ref, () => ({
    reveal: (url) => setPool([url]),
    hide: () => {
      setSettled(null)
      inner.current?.triggerHide()
    },
  }))

  useEffect(() => {
    if (src) setPool((prev) => (prev.length === 1 && prev[0] === src ? prev : [src]))
  }, [src])

  // Reveal once the pool holds the image; img-fx picks from `images` per reveal.
  useEffect(() => {
    if (!pool.length) return
    const id = window.setTimeout(() => inner.current?.triggerReveal({ hold: "manual" }), 60)
    return () => window.clearTimeout(id)
  }, [pool])

  if (settled) return <img src={settled} alt="" className={cn("block object-cover", className)} style={style} />

  return (
    <ImageGeneration
      ref={inner}
      preset={preset}
      theme={theme}
      images={pool}
      cardBg={p.page}
      colors={colors}
      borderRadius={0}
      onCycle={(e) => {
        if (e.phase === "visible" && e.src) setSettled(e.src)
      }}
      className={cn("block", className)}
      style={style}
    >
      <div className="h-full w-full" />
    </ImageGeneration>
  )
})

export default GeneratingImageImpl
