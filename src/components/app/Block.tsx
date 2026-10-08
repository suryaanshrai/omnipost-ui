import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A titled sub-section of a screen: ink eyebrow + right-aligned aside over a hairline. */
export default function Block({
  title,
  aside,
  children,
  className,
  id,
}: {
  title: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn("mt-14", className)}>
      <div className="flex items-end justify-between gap-4 border-b border-hair pb-4">
        <h2 className="eyebrow text-ink">{title}</h2>
        {aside != null && <span className="eyebrow text-right">{aside}</span>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}
