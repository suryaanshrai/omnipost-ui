import { useRef } from "react"
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

/**
 * The magnetic-button motif from Landing Page v2.dc.html: the primary CTAs
 * drift toward the pointer as it approaches, at a fraction of the offset
 * (`dx*0.16, dy*0.3` in the source — the y-axis pulls harder, which is what
 * gives it a "settling" feel rather than a 1:1 drag), and spring back to
 * `translate(0,0)` on leave.
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
  const Tag = (as ?? "a") as ElementType
  const ref = useRef<HTMLElement>(null)

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - r.left - r.width / 2) * 0.16
    const dy = (e.clientY - r.top - r.height / 2) * 0.3
    el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`
  }

  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)"
  }

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ transition: "transform .2s cubic-bezier(.16,1,.3,1)" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      {...props}
    >
      {children}
    </Tag>
  )
}
