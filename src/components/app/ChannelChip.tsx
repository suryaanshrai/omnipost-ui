import { Liquid } from "liquid-gooey"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { platformHue } from "@/lib/platforms"
import { useReducedMotion } from "@/lib/fx"
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

const MorphContext = createContext<() => void>(() => {})

/**
 * The row ChannelToggles live in. The selected chips' ink fill is liquid
 * (liquid-gooey): it swells into a chip when it's picked, drains out when
 * it's dropped, and neighbouring picks pull a faint neck of ink between
 * them. The chip text and dot ride crisp on top. The goo only runs while a
 * fill is moving — at rest the fills are plain square blocks, as an idle
 * chip should be, and no SVG blur is re-rastered on every repaint.
 */
export function ChannelToggleGroup({ children, className }: { children: ReactNode; className?: string }) {
  const [morphing, setMorphing] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const morph = () => {
    setMorphing(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMorphing(false), 900)
  }
  return (
    <MorphContext.Provider value={morph}>
      <Liquid blur={morphing ? 4 : 0} contrast={24} fill="var(--ink)" className={cn("flex flex-wrap gap-2", className)}>
        {children}
      </Liquid>
    </MorphContext.Provider>
  )
}

/** A selectable chip: liquid ink fill + page text when selected; transparent, ink-55, hairline when idle. Use inside ChannelToggleGroup. */
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
  const reduced = useReducedMotion()
  const morph = useContext(MorphContext)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => {
        if (!reduced) morph()
        onToggle()
      }}
      className={cn(
        "relative inline-flex items-center gap-2 border px-3 py-2 text-[11px] font-semibold transition-colors duration-200 disabled:opacity-40",
        selected ? "border-transparent text-page" : "border-hair bg-transparent text-ink-55 hover:border-ink hover:text-ink"
      )}
    >
      <Liquid.Item
        className="pointer-events-none absolute -inset-px"
        style={{ display: "block" }}
        radius={0}
        scale={selected ? 1 : 0}
        transition={reduced ? { duration: 0 } : "bouncy"}
      >
        <span />
      </Liquid.Item>
      <span
        aria-hidden="true"
        className="relative h-[5px] w-[5px] shrink-0 rounded-full"
        style={{ background: platformHue(channel.connector_slug) }}
      />
      <span className="relative">{channel.display_name}</span>
    </button>
  )
}
