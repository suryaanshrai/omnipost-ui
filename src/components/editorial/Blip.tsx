import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

/** The pulsing rust status dot followed by an eyebrow label ("Live dispatch · every channel"). */
export default function Blip({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="blip" aria-hidden="true" />
      {children != null && <span className="eyebrow">{children}</span>}
    </span>
  )
}
