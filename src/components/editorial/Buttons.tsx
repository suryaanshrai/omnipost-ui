import { cn } from "@/lib/utils"
import type { ComponentPropsWithoutRef } from "react"

/** Ink block, page text, uppercase tracked label; hover → rust. */
export function PrimaryButton({ className, ...props }: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 bg-ink px-[26px] py-[15px] text-[11px] font-bold tracking-[0.18em] text-page uppercase transition-colors duration-300 hover:bg-rust disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
}

/** 1px bordered, transparent; hover inverts to ink. */
export function OutlineButton({ className, ...props }: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 border border-hair px-4 py-2.5 text-[10px] font-bold tracking-[0.16em] text-ink uppercase transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-page disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props}
    />
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
