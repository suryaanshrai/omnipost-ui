import { useEffect, useRef, type ReactNode } from "react"
import { takeHeadingFocus, useDocumentTitle } from "@/lib/page"
import { cn } from "@/lib/utils"

/**
 * The section header repeated on every screen of the design: a tracked
 * eyebrow ("01 · Published") above a serif headline, a count/label set
 * right-aligned in the same eyebrow style, and a hairline underneath.
 * `size="app"` is the ~44px in-app headline; `size="landing"` is the
 * landing page's clamp(30px, 3.4vw, 46px).
 *
 * An in-app screen's h1 also names the tab ("Drafts · OmniPost") and takes
 * focus after an in-app navigation (lib/page.ts).
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
  const heading = useRef<HTMLHeadingElement>(null)
  const isPageTitle = Heading === "h1" && size === "app"
  useDocumentTitle(isPageTitle && typeof title === "string" ? title : null)
  useEffect(() => {
    if (isPageTitle) takeHeadingFocus(heading.current)
  }, [isPageTitle])

  return (
    <header className={cn("flex items-end justify-between gap-6 border-b border-hair pb-5", className)}>
      <div className="min-w-0">
        <div className="eyebrow mb-3">{eyebrow}</div>
        <Heading
          ref={heading}
          tabIndex={isPageTitle ? -1 : undefined}
          className={cn(
            "focus:outline-none",
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
