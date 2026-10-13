import { cn } from "@/lib/utils"
import Orb, { type OrbState } from "./Orb"

/** An inline orb beside an eyebrow — the screen-level "Loading…" line. */
export default function Loading({
  label = "Loading",
  state = "searching",
  className,
}: {
  label?: string
  state?: OrbState
  className?: string
}) {
  return (
    <p role="status" className={cn("inline-flex items-center gap-3", className)}>
      <Orb state={state} size={20} />
      <span className="eyebrow">{label}…</span>
    </p>
  )
}
