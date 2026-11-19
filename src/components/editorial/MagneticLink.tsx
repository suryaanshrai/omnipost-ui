import { useEffect, useRef } from "react"
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

/**
 * The magnetic-button motif from Landing Page v2.dc.html: the primary CTAs
 * drift toward the pointer as it approaches, at a fraction of the offset
 * (`dx*0.16, dy*0.3` in the source — the y-axis pulls harder, which is what
 * gives it a "settling" feel rather than a 1:1 drag), and spring back to
 * `translate(0,0)` on leave.
 *
 * The button's box is measured once per approach (on pointerenter), not on
 * every move, and the offset goes through the `translate` property so it
 * composes with, rather than replaces, the call site's colour transition.
 */
export default function MagneticLink<T extends ElementType = "a">({
  as,
  className,
  children,
  ...props
}: {
  as?: T
  className?: string
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc needs it
  const Tag = (as ?? "a") as ElementType
  const ref = useRef<HTMLElement>(null)
  const rect = useRef<DOMRect | null>(null)
  const still = useRef(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => (still.current = query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  const onPointerEnter = () => {
    // Measured without the current offset, so the pull stays centred.
    if (ref.current) rect.current = ref.current.getBoundingClientRect()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current
    const r = rect.current
    if (!el || !r || still.current || e.pointerType !== "mouse") return
    const dx = (e.clientX - r.left - r.width / 2) * 0.16
    const dy = (e.clientY - r.top - r.height / 2) * 0.3
    el.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`
  }

  const onPointerLeave = () => {
    rect.current = null
    if (ref.current) ref.current.style.translate = "0 0"
  }

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ transition: "translate .2s cubic-bezier(.16,1,.3,1), background-color .3s, color .3s" }}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      {...props}
    >
      {children}
    </Tag>
  )
}
