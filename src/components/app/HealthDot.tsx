import { healthLabel } from "@/lib/connectors"
import { cn } from "@/lib/utils"
import type { ChannelHealth } from "@/types/api"

/** healthy = ink-38 ring; needs_attention = rust ring; broken = rust filled. */
export default function HealthDot({ health, className }: { health: ChannelHealth; className?: string }) {
  return (
    <span
      role="img"
      aria-label={healthLabel(health)}
      title={healthLabel(health)}
      className={cn(
        "inline-block h-[8px] w-[8px] shrink-0 rounded-full border",
        health === "healthy" && "border-ink-38 bg-ink-38",
        health === "needs_attention" && "border-rust bg-transparent",
        health === "broken" && "border-rust bg-rust",
        className
      )}
    />
  )
}
