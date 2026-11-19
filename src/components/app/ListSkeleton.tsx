import { cn } from "@/lib/utils"

/**
 * Placeholder rows while a list loads, shaped like the entries that will
 * replace them (eyebrow line, two lines of body, a chip), so nothing jumps
 * when the data arrives. The faint pulse stops under reduced motion.
 */
export default function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn("mt-6", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden="true" className="border-b border-hair py-8">
          <div className="skeleton h-[9px] w-40" />
          <div className="skeleton mt-6 h-[14px] w-[88%] max-w-[560px]" />
          <div className="skeleton mt-3 h-[14px] w-[62%] max-w-[400px]" />
          <div className="skeleton mt-6 h-[28px] w-24" />
        </div>
      ))}
    </div>
  )
}
