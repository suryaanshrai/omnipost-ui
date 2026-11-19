import { cn } from "@/lib/utils"
import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react"

/**
 * The row-hover-inversion motif, reused across the design for capability
 * rows, platform rows, post-type rows, and sidebar nav: on hover the row
 * background inverts, its number goes ember, its title slides a few pixels
 * and turns page-colored, and a trailing arrow fades in from the left.
 *
 * The source implements this with `onMouseEnter`/`onMouseLeave` handlers
 * that hand-query `[data-role="…"]` children and mutate their styles
 * directly — necessary there because the design canvas has no build step to
 * generate CSS. Here it's a plain `group`/`group-hover:` composition: no
 * JS, no DOM queries. When the row itself is focusable (a button or link),
 * keyboard focus shows the same inversion (`focus-visible:` /
 * `group-focus-visible:`), and the slides are dropped for reduced motion.
 * The number and arrow are decoration, hidden from assistive tech so a
 * row's accessible name is just its title and description.
 *
 * Most rows invert to solid ink. A platform row in the design instead
 * hovers to that platform's own faint tint (`data-tint` in the source) —
 * pass `tint` for that case; it's threaded through a CSS variable so
 * Tailwind's arbitrary-value hover class can reference a runtime color.
 */
function HoverRow<T extends ElementType = "div">({
  as,
  tint,
  className,
  children,
  ...props
}: {
  as?: T
  /** A platform-specific hover tint (e.g. "rgba(196,80,30,.09)") in place of the default solid-ink invert. */
  tint?: string
  className?: string
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc needs it
  const Tag = (as ?? "div") as ElementType
  const style = tint ? ({ "--row-tint": tint } as CSSProperties) : undefined

  return (
    <Tag
      className={cn(
        "group border-b border-hair transition-colors duration-500",
        tint ? "hover:bg-[var(--row-tint)] focus-visible:bg-[var(--row-tint)]" : "hover:bg-ink focus-visible:bg-ink",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </Tag>
  )
}

function Num({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-display text-ink-38 transition-colors duration-350 group-hover:text-ember group-focus-visible:text-ember",
        className
      )}
    >
      {children}
    </span>
  )
}

function Title({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "text-ink transition-[color,transform] duration-450 ease-out group-hover:text-page group-focus-visible:text-page motion-safe:group-hover:translate-x-2 motion-safe:group-focus-visible:translate-x-2",
        className
      )}
    >
      {children}
    </span>
  )
}

function Desc({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn("text-ink-55 transition-colors duration-450 group-hover:text-page/65 group-focus-visible:text-page/65", className)}>
      {children}
    </p>
  )
}

function Arrow({ className, children = "→" }: { className?: string; children?: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-rust opacity-0 transition-[opacity,translate] duration-450 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:-translate-x-3.5 motion-safe:group-hover:translate-x-0 motion-safe:group-focus-visible:translate-x-0",
        className
      )}
    >
      {children}
    </span>
  )
}

HoverRow.Num = Num
HoverRow.Title = Title
HoverRow.Desc = Desc
HoverRow.Arrow = Arrow

export default HoverRow
