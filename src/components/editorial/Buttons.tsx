import { cn } from "@/lib/utils"
import { useFxPalette } from "@/lib/fx"
import Beam from "@/components/fx/Beam"
import Orb, { type OrbState } from "@/components/fx/Orb"
import type { ComponentPropsWithoutRef } from "react"

type ActionProps = ComponentPropsWithoutRef<"button"> & {
  /** In flight: a thinking orb precedes the label and the button reports aria-busy. */
  pending?: boolean
  /** Which orb animation names the work (default `working`). */
  orb?: OrbState
}

/**
 * Ink block, page text, uppercase tracked label; hover → rust. `beam` runs
 * the rust border beam around it — for the one action a screen leads with —
 * and keeps it running faster while `pending`.
 */
export function PrimaryButton({
  className,
  pending,
  orb = "working",
  beam,
  disabled,
  children,
  ...props
}: ActionProps & { beam?: boolean }) {
  const palette = useFxPalette()
  const button = (
    <button
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 bg-ink px-[26px] py-[15px] text-[11px] font-bold tracking-[0.18em] text-page uppercase transition-colors duration-300 hover:bg-rust disabled:pointer-events-none disabled:opacity-40",
        pending && "disabled:opacity-80",
        className
      )}
      {...props}
    >
      {pending && <Orb state={orb} size={20} color={palette.page} className="-my-1" />}
      {children}
    </button>
  )
  if (!beam) return button
  return (
    <Beam size="sm" surface="ink" duration={pending ? 1.2 : 2.6} strength={disabled && !pending ? 0 : 0.85} className="inline-flex">
      {button}
    </Beam>
  )
}

/** 1px bordered, transparent; hover inverts to ink. */
export function OutlineButton({ className, pending, orb = "working", disabled, children, ...props }: ActionProps) {
  return (
    <button
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 border border-hair px-4 py-2.5 text-[10px] font-bold tracking-[0.16em] text-ink uppercase transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-page disabled:pointer-events-none disabled:opacity-40",
        pending && "border-rust/60 disabled:opacity-90",
        className
      )}
      {...props}
    >
      {pending && <Orb state={orb} size={20} className="-my-1" />}
      {children}
    </button>
  )
}

/** Text link with a 1px underline rule — the design's secondary action. */
export function TextButton({ className, tone = "ink", ...props }: ComponentPropsWithoutRef<"button"> & { tone?: "ink" | "rust" | "muted" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 border-b pb-0.5 text-[10.5px] font-bold tracking-[0.16em] uppercase transition-colors duration-300 disabled:pointer-events-none disabled:opacity-40",
        tone === "ink" && "border-ink text-ink hover:border-rust hover:text-rust",
        tone === "rust" && "border-rust text-rust hover:border-ink hover:text-ink",
        tone === "muted" && "border-hair text-ink-55 hover:border-ink hover:text-ink",
        className
      )}
      {...props}
    />
  )
}
