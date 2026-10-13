import { Liquid } from "liquid-gooey"
import { useLayoutEffect, useState } from "react"
import { useReducedMotion } from "@/lib/fx"
import { cn } from "@/lib/utils"

export type Rect = { x: number; y: number; w: number; h: number }

/**
 * An active-item marker that travels as liquid (liquid-gooey's `move`
 * effect): the marker glides to the active element's box and the goo
 * stretches after it with a droplet tail. Absolutely positioned over
 * `container` (which must be `position: relative`) and behind its content,
 * so whatever sits on top stays crisp and clickable. `shape` turns the
 * active element's box into the marker's box — a gutter bar, an underline,
 * a full segment.
 */
export default function LiquidIndicator({
  container,
  target,
  shape = (r) => r,
  fill = "var(--fx-accent)",
  blur = 6,
  className,
}: {
  container: HTMLElement | null
  target: HTMLElement | null
  shape?: (r: Rect) => Rect
  fill?: string
  /** Goo blur sigma. Keep it under half the marker's thinnest side or the threshold eats the marker. */
  blur?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const [box, setBox] = useState<Rect | null>(null)

  useLayoutEffect(() => {
    if (!container || !target) {
      setBox(null)
      return
    }
    const measure = () => {
      const c = container.getBoundingClientRect()
      const t = target.getBoundingClientRect()
      setBox({ x: t.left - c.left, y: t.top - c.top, w: t.width, h: t.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(container)
    ro.observe(target)
    return () => ro.disconnect()
  }, [container, target])

  if (!box) return null
  const s = shape(box)

  return (
    <Liquid
      aria-hidden="true"
      blur={blur}
      contrast={22}
      fill={fill}
      className={cn("pointer-events-none !absolute inset-0 z-0", className)}
    >
      <Liquid.Item effect="move" move={{ springiness: 0.42, wobble: 0.45, stretch: 0.4, trail: 0.5 }} radius={0}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: s.w,
            height: s.h,
            transform: `translate(${s.x}px, ${s.y}px)`,
            transition: reduced ? "none" : "transform .55s cubic-bezier(.16,1,.3,1), width .4s, height .4s",
          }}
        />
      </Liquid.Item>
    </Liquid>
  )
}
