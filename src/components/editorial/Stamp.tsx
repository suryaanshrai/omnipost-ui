import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"

/** A formatted instant ("Aug 24 · 10:00 AM") as a <time>, so it is machine-readable too. */
export default function Stamp({ iso, className }: { iso: string | null | undefined; className?: string }) {
  if (!iso) return null
  return (
    <time dateTime={iso} className={cn(className)}>
      {formatStamp(iso)}
    </time>
  )
}
