import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

/**
 * The section header repeated on every screen of the design: a tracked
 * eyebrow ("01 · Published") above a serif headline, a count/label set
 * right-aligned in the same eyebrow style, and a hairline underneath.
 * `size="app"` is the ~44px in-app headline; `size="landing"` is the
 * landing page's clamp(30px, 3.4vw, 46px).
 */
export default function SectionHeader({
  eyebrow,
  title,
  aside,
  size = "app",
  as: Heading = "h1",
  className,
}: {
  eyebrow: ReactNode
  title: ReactNode
  aside?: ReactNode
  size?: "app" | "landing"
  as?: "h1" | "h2"
  className?: string
}) {
  return (
    <header className={cn("flex items-end justify-between gap-6 border-b border-hair pb-5", className)}>
      <div className="min-w-0">
        <div className="eyebrow mb-3">{eyebrow}</div>
        <Heading
          className={cn(
            "display text-ink",
            size === "app" ? "text-[36px] sm:text-[44px] leading-[1.02]" : "text-[clamp(30px,3.4vw,46px)] leading-[1.04]"
          )}
        >
          {title}
        </Heading>
      </div>
      {aside != null && <div className="eyebrow shrink-0 pb-1.5 text-right">{aside}</div>}
    </header>
  )
}
