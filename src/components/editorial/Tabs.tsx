import * as RadixTabs from "@radix-ui/react-tabs"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Hairline tabs. Radix gives them the keyboard behaviour screen-reader and
 * keyboard users expect: arrow keys move between tabs, Home/End jump, and
 * only the active tab is in the Tab order.
 */
export function Tabs({
  value,
  onValueChange,
  tabs,
  label,
  size = "md",
  className,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  tabs: { value: string; label: ReactNode }[]
  label: string
  size?: "sm" | "md"
  className?: string
  children: ReactNode
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List aria-label={label} className={cn("flex flex-wrap border-b border-hair", size === "sm" ? "gap-6" : "gap-8")}>
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              "-mb-px min-h-6 border-b border-transparent font-bold uppercase transition-colors",
              "text-ink-55 hover:text-ink data-[state=active]:border-rust data-[state=active]:text-ink",
              size === "sm" ? "pb-2.5 text-[10px] tracking-[0.16em]" : "pb-3 text-[11px] tracking-[0.18em]"
            )}
          >
            {t.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  )
}

export function TabPanel({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <RadixTabs.Content value={value} className={cn("focus-visible:outline-none", className)}>
      {children}
    </RadixTabs.Content>
  )
}
