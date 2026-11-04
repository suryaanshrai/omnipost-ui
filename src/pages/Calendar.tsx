import { useMemo, useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { kindLabel } from "@/components/compose/compose-context"
import { OutlineButton } from "@/components/editorial/Buttons"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, type Page } from "@/lib/api"
import { WEEKDAYS } from "@/lib/format"
import { platformHue } from "@/lib/platforms"
import { useChannelMap } from "@/lib/queries"
import { useSectionEyebrow } from "@/lib/nav"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { BlackoutWindow, CalendarEntry, QueueSlot } from "@/types/api"

const DAY_MS = 24 * 3600_000
import { weekStart, addDays } from "./calendar/dates"
import { BlackoutBlock } from "./calendar/BlackoutBlock"
import { RecurrenceBlock } from "./calendar/RecurrenceBlock"
import { ImportBlock } from "./calendar/ImportBlock"

const dayHead = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" })
const hourMinute = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })

export default function Calendar() {
  const eyebrow = useSectionEyebrow("/app/calendar", "Schedule")
  const { activeWorkspace } = useWorkspace()
  const { map: channels } = useChannelMap()
  const [anchor, setAnchor] = useState(() => weekStart(new Date()))
  const end = addDays(anchor, 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i))
  const today = new Date()

  const entries = useQuery({
    queryKey: ["calendar", activeWorkspace.id, anchor.toISOString()],
    queryFn: () =>
      apiFetch<CalendarEntry[]>(
        `/posts/calendar/?workspace=${activeWorkspace.id}&start=${encodeURIComponent(anchor.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
      ),
  })
  const slots = useQuery({
    queryKey: ["queue-slots-all", activeWorkspace.id],
    queryFn: () => apiFetch<Page<QueueSlot>>(`/queue-slots/?workspace=${activeWorkspace.id}&limit=500`),
    select: (page) => page.results.filter((s) => s.is_active !== false),
  })
  const blackouts = useQuery({
    queryKey: ["blackout-windows", activeWorkspace.id],
    queryFn: () => apiFetch<Page<BlackoutWindow>>(`/blackout-windows/?workspace=${activeWorkspace.id}&limit=200`),
    select: (page) => page.results,
  })

  const byDay = useMemo(() => {
    const out: CalendarEntry[][] = days.map(() => [])
    for (const e of entries.data ?? []) {
      if (!e.run_at) continue
      // Midnight-to-midnight, rounded: a DST week has a 23h or 25h day.
      const at = new Date(e.run_at)
      const midnight = new Date(at.getFullYear(), at.getMonth(), at.getDate())
      const idx = Math.round((midnight.getTime() - anchor.getTime()) / DAY_MS)
      if (idx >= 0 && idx < 7) out[idx].push(e)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps -- days derives from anchor
  }, [entries.data, anchor])

  const total = entries.data?.length ?? 0

  return (
    <div className="max-w-[1100px]">
      <SectionHeader eyebrow={eyebrow} title="Calendar" aside={`${total} this week`} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="display text-[22px]">
          {dayHead.format(anchor)} – {dayHead.format(addDays(anchor, 6))}
        </div>
        <div className="flex items-center gap-2">
          <OutlineButton type="button" aria-label="Previous week" onClick={() => setAnchor(addDays(anchor, -7))}>
            ←
          </OutlineButton>
          <OutlineButton type="button" onClick={() => setAnchor(weekStart(new Date()))}>
            This week
          </OutlineButton>
          <OutlineButton type="button" aria-label="Next week" onClick={() => setAnchor(addDays(anchor, 7))}>
            →
          </OutlineButton>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 border-t border-l border-hair md:grid-cols-7">
        {days.map((day, i) => {
          const dayEnd = addDays(day, 1)
          const isToday = day.toDateString() === today.toDateString()
          const daySlots = (slots.data ?? []).filter((s) => s.weekday === i)
          const dayBlackouts = (blackouts.data ?? []).filter(
            (b) => b.is_active !== false && new Date(b.starts_at) < dayEnd && new Date(b.ends_at) > day
          )
          return (
            <div
              key={day.toISOString()}
              className={cn("relative min-h-[72px] border-r border-b border-hair md:min-h-[360px]", dayBlackouts.length && "hatch")}
            >
              <div className="flex items-baseline justify-between border-b border-hair px-3 py-2.5">
                <span className={cn("eyebrow", isToday && "text-rust")}>{WEEKDAYS[i]}</span>
                <span className={cn("font-display text-[18px] leading-none", isToday ? "text-rust" : "text-ink")}>
                  {day.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {dayBlackouts.map((b) => (
                  <div key={b.id} className="bg-page/85 px-2 py-1.5 text-[10.5px] leading-[1.4] text-ink-55">
                    <span className="font-bold tracking-[0.12em] uppercase">Blackout</span>
                    {b.label && <span> · {b.label}</span>}
                    <span className="block">{b.channel ? channels.get(b.channel)?.display_name ?? "One channel" : "All channels"}</span>
                  </div>
                ))}
                {byDay[i]
                  .slice()
                  .sort((a, b) => (a.run_at ?? "").localeCompare(b.run_at ?? ""))
                  .map((e) => {
                    const ch = channels.get(e.channel)
                    return (
                      <Link
                        key={e.id}
                        to={e.post_status === "published" || e.post_status === "failed" ? "/app" : "/app/drafts"}
                        className={cn(
                          "block border border-hair bg-page px-2 py-2 transition-colors hover:border-ink",
                          e.status === "failed" && "border-rust/60"
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: platformHue(ch?.connector_slug ?? "") }} />
                          <span className="eyebrow text-ink">{hourMinute.format(new Date(e.run_at!))}</span>
                          <span className={cn("eyebrow ml-auto", e.status === "failed" && "text-rust")}>{e.status}</span>
                        </span>
                        <span className="mt-1 block truncate text-[11.5px] font-semibold text-ink">{ch?.display_name ?? "Channel"}</span>
                        <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-[1.45] text-ink-55">
                          {e.text_override || e.post_text || kindLabel(e.post_kind)}
                        </span>
                      </Link>
                    )
                  })}
                {daySlots.map((s) => (
                  <div
                    key={s.id}
                    title="Open queue slot"
                    className="flex items-center gap-1.5 border border-dashed border-hair px-2 py-1 text-[10.5px] text-ink-38"
                  >
                    <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full opacity-50" style={{ background: platformHue(channels.get(s.channel)?.connector_slug ?? "") }} />
                    {s.time_of_day.slice(0, 5)} · slot
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[12px] text-ink-45">
        Dashed marks are weekly queue slots, read in each channel's own timezone. Hatched days have a blackout window.
      </p>

      <div className="max-w-[760px]">
        <BlackoutBlock channels={[...channels.values()]} windows={blackouts.data ?? []} />
        <RecurrenceBlock />
        <ImportBlock />
      </div>
    </div>
  )
}
