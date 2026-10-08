import { platformHue } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import type { Channel } from "@/types/api"

/** 5px platform dot + channel display name (+ an optional status word; failures in rust). */
export function ChannelChip({
  channel,
  status,
  className,
}: {
  channel: Pick<Channel, "display_name" | "connector_slug"> | undefined
  status?: string
  className?: string
}) {
  const failed = status === "failed"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border border-hair px-2.5 py-1.5 text-[11px] font-semibold text-ink",
        failed && "border-rust/50",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="h-[5px] w-[5px] shrink-0 rounded-full"
        style={{ background: platformHue(channel?.connector_slug ?? "") }}
      />
      <span>{channel?.display_name ?? "Removed channel"}</span>
      {status && (
        <span className={cn("text-[9.5px] font-bold tracking-[0.14em] uppercase", failed ? "text-rust" : "text-ink-45")}>
          {status}
        </span>
      )}
    </span>
  )
}

/** A selectable chip: ink fill + page text when selected; transparent, ink-55, hairline when idle. */
export function ChannelToggle({
  channel,
  selected,
  onToggle,
  disabled,
}: {
  channel: Pick<Channel, "display_name" | "connector_slug">
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 border px-3 py-2 text-[11px] font-semibold transition-colors duration-200 disabled:opacity-40",
        selected ? "border-ink bg-ink text-page" : "border-hair bg-transparent text-ink-55 hover:border-ink hover:text-ink"
      )}
    >
      <span
        aria-hidden="true"
        className="h-[5px] w-[5px] shrink-0 rounded-full"
        style={{ background: platformHue(channel.connector_slug) }}
      />
      {channel.display_name}
    </button>
  )
}
