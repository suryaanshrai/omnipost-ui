import { cn } from "@/lib/utils"

/** "OmniPost" in the serif plus the small "v1" eyebrow, at whatever size the call site needs. */
export default function Wordmark({ className, size = 23 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 text-ink", className)}>
      <span className="font-display leading-none" style={{ fontSize: size }}>
        OmniPost
      </span>
      <span className="eyebrow text-ink-38">v1</span>
    </span>
  )
}
