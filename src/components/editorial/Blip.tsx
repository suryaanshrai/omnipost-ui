import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import Orb, { type OrbState } from "@/components/fx/Orb"

/**
 * The pulsing rust status dot followed by an eyebrow label ("Live dispatch ·
 * every channel"). With `orb`, a thinking orb names the activity in place of the dot.
 */
export default function Blip({ children, className, orb }: { children?: ReactNode; className?: string; orb?: OrbState }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {orb ? <Orb state={orb} size={20} className="-ml-[7px]" /> : <span className="blip" aria-hidden="true" />}
      {children != null && <span className="eyebrow">{children}</span>}
    </span>
  )
}
