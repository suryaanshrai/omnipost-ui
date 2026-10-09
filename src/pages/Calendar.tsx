import { useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { kindLabel, POST_KINDS } from "@/components/compose/compose-context"
import { OutlineButton, PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import Field, { SelectField, TextareaField } from "@/components/editorial/Field"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { formatStamp, fromLocalInput, WEEKDAYS } from "@/lib/format"
import { platformHue } from "@/lib/platforms"
import { useChannelMap, useChannels } from "@/lib/queries"
import { useSectionEyebrow } from "@/lib/nav"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { BlackoutWindow, CalendarEntry, Channel, ImportCsvResult, PostKind, QueueSlot, RecurrenceRule } from "@/types/api"

const DAY_MS = 24 * 3600_000

/** Monday 00:00 local of the week containing `d`. */
function weekStart(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const offset = (start.getDay() + 6) % 7 // 0 = Monday
  start.setDate(start.getDate() - offset)
  return start
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

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

function BlackoutBlock({ channels, windows }: { channels: Channel[]; windows: BlackoutWindow[] }) {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [label, setLabel] = useState("")
  const [channel, setChannel] = useState("")
  const [starts, setStarts] = useState("")
  const [ends, setEnds] = useState("")
  const [error, setError] = useState<ApiError | null>(null)
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["blackout-windows", activeWorkspace.id] })
  }
  const add = useMutation({
    mutationFn: () =>
      apiFetch<BlackoutWindow>("/blackout-windows/", {
        method: "POST",
        body: {
          workspace: activeWorkspace.id,
          channel: channel ? Number(channel) : null,
          label: label.trim(),
          starts_at: fromLocalInput(starts),
          ends_at: fromLocalInput(ends),
        },
      }),
    onSuccess: () => {
      setError(null)
      setLabel("")
      setStarts("")
      setEnds("")
      invalidate()
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not add the window.")),
  })
  const toggle = useMutation({
    mutationFn: (w: BlackoutWindow) => apiFetch(`/blackout-windows/${w.id}/`, { method: "PATCH", body: { is_active: !w.is_active } }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (w: BlackoutWindow) => apiFetch(`/blackout-windows/${w.id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  })
  const name = (id: number | null | undefined) => (id ? channels.find((c) => c.id === id)?.display_name ?? "One channel" : "All channels")
  const sorted = [...windows].sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  return (
    <Block title="Blackout windows" aside="The queue skips these">
      <ul className="-mt-6 empty:mt-0">
        {sorted.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hair py-3">
            <span className={cn("min-w-0 flex-1", w.is_active === false && "text-ink-38")}>
              <span className="block text-[14px] font-semibold">{w.label || "Blackout"}</span>
              <span className="eyebrow mt-0.5 block">
                {name(w.channel)} · {formatStamp(w.starts_at)} → {formatStamp(w.ends_at)}
              </span>
            </span>
            <TextButton type="button" tone="muted" onClick={() => toggle.mutate(w)}>
              {w.is_active === false ? "Resume" : "Pause"}
            </TextButton>
            <TextButton type="button" tone="muted" onClick={() => remove.mutate(w)}>
              Remove
            </TextButton>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          add.mutate()
        }}
        className="mt-6 grid gap-6 sm:grid-cols-2"
      >
        <Field label="Label (optional)" placeholder="Product launch freeze" value={label} onChange={(e) => setLabel(e.target.value)} />
        <SelectField label="Applies to" value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="">All channels</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </SelectField>
        <Field label="Starts" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} errors={error?.fieldErrors.starts_at} />
        <Field label="Ends" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} errors={error?.fieldErrors.ends_at} />
        {error && !error.fieldErrors.starts_at && !error.fieldErrors.ends_at && (
          <p className="text-[13px] text-rust sm:col-span-2">{error.detail}</p>
        )}
        <div className="sm:col-span-2">
          <OutlineButton type="submit" disabled={!starts || !ends || add.isPending}>
            Add blackout
          </OutlineButton>
        </div>
      </form>
    </Block>
  )
}

function RecurrenceBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const channels = useChannels()
  const rules = useQuery({
    queryKey: ["recurrence-rules", activeWorkspace.id],
    queryFn: () => apiFetch<Page<RecurrenceRule>>(`/recurrence-rules/?workspace=${activeWorkspace.id}&limit=200`),
    select: (page) => page.results,
  })
  const [channel, setChannel] = useState("")
  const [kind, setKind] = useState<PostKind>("text")
  const [variants, setVariants] = useState("")
  const [interval, setIntervalHours] = useState("168")
  const [next, setNext] = useState("")
  const [endAt, setEndAt] = useState("")
  const [error, setError] = useState<ApiError | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["recurrence-rules", activeWorkspace.id] })
  const channelList = channels.data ?? []
  const chosen = channel || String(channelList[0]?.id ?? "")

  const add = useMutation({
    mutationFn: () =>
      apiFetch<RecurrenceRule>("/recurrence-rules/", {
        method: "POST",
        body: {
          workspace: activeWorkspace.id,
          channel: Number(chosen),
          kind,
          variants: variants
            .split(/\n\s*\n/)
            .map((v) => v.trim())
            .filter(Boolean),
          interval_hours: Number(interval),
          next_run_at: fromLocalInput(next),
          end_at: fromLocalInput(endAt),
        },
      }),
    onSuccess: () => {
      setError(null)
      setVariants("")
      setNext("")
      setEndAt("")
      invalidate()
      toast("Recurring post added")
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not add the rule.")),
  })
  const toggle = useMutation({
    mutationFn: (r: RecurrenceRule) => apiFetch(`/recurrence-rules/${r.id}/`, { method: "PATCH", body: { is_active: !r.is_active } }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (r: RecurrenceRule) => apiFetch(`/recurrence-rules/${r.id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  const every = (h: number) => (h % 168 === 0 ? `${h / 168} wk` : h % 24 === 0 ? `${h / 24} d` : `${h} h`)

  return (
    <Block title="Recurring posts" aside="Evergreen">
      <p className="mb-5 max-w-[560px] text-[14px] leading-[1.6] text-ink-55">
        A post that goes out on a fixed interval, rotating through its variants so it never reads as a copy-paste loop.
      </p>
      <ul className="border-t border-hair empty:border-0">
        {(rules.data ?? []).map((r) => {
          const vs = Array.isArray(r.variants) ? (r.variants as string[]) : []
          return (
            <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 border-b border-hair py-3">
              <span className={cn("min-w-0 flex-1", r.is_active === false && "text-ink-38")}>
                <span className="block truncate text-[14px] font-semibold">{vs[0] ?? kindLabel(r.kind)}</span>
                <span className="eyebrow mt-0.5 block">
                  {channelList.find((c) => c.id === r.channel)?.display_name ?? "Channel"} · every {every(r.interval_hours)} ·{" "}
                  {vs.length} {vs.length === 1 ? "variant" : "variants"} · next {formatStamp(r.next_run_at)}
                  {r.end_at && ` · until ${formatStamp(r.end_at)}`}
                </span>
              </span>
              <TextButton type="button" tone="muted" onClick={() => toggle.mutate(r)}>
                {r.is_active === false ? "Resume" : "Pause"}
              </TextButton>
              <TextButton type="button" tone="muted" onClick={() => remove.mutate(r)}>
                Remove
              </TextButton>
            </li>
          )
        })}
      </ul>
      {channelList.length === 0 ? (
        <p className="mt-4 text-[14px] text-ink-55">
          <Link to="/app/connections" className="text-ink underline underline-offset-4 hover:text-rust">
            Connect a channel
          </Link>{" "}
          to set one up.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add.mutate()
          }}
          className="mt-6 grid gap-6 sm:grid-cols-2"
        >
          <SelectField label="Channel" value={chosen} onChange={(e) => setChannel(e.target.value)} errors={error?.fieldErrors.channel}>
            {channelList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Kind" value={kind} onChange={(e) => setKind(e.target.value as PostKind)}>
            {POST_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </SelectField>
          <TextareaField
            className="sm:col-span-2"
            label="Variants"
            rows={4}
            hint="One per paragraph — separate them with a blank line."
            value={variants}
            onChange={(e) => setVariants(e.target.value)}
            errors={error?.fieldErrors.variants}
          />
          <Field
            label="Every (hours)"
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setIntervalHours(e.target.value)}
            errors={error?.fieldErrors.interval_hours}
            hint="168 = weekly."
          />
          <Field label="First run" type="datetime-local" value={next} onChange={(e) => setNext(e.target.value)} errors={error?.fieldErrors.next_run_at} />
          <Field label="Stop after (optional)" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} errors={error?.fieldErrors.end_at} />
          {error && !Object.keys(error.fieldErrors).some((k) => ["channel", "variants", "interval_hours", "next_run_at", "end_at"].includes(k)) && (
            <p className="text-[13px] text-rust sm:col-span-2">{error.detail}</p>
          )}
          <div className="sm:col-span-2">
            <OutlineButton type="submit" disabled={!variants.trim() || !next || !interval || add.isPending}>
              Add recurring post
            </OutlineButton>
          </div>
        </form>
      )}
    </Block>
  )
}

function ImportBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportCsvResult | null>(null)
  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append("workspace", String(activeWorkspace.id))
      form.append("file", file!)
      return apiFetch<ImportCsvResult>("/posts/import-csv/", { method: "POST", body: form })
    },
    onSuccess: (r) => {
      setResult(r)
      queryClient.invalidateQueries({ queryKey: ["calendar"] })
      queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "Could not import the file."),
  })

  return (
    <Block title="Import from CSV" aside="Bulk schedule">
      <p className="max-w-[560px] text-[14px] leading-[1.6] text-ink-55">
        Columns <code className="text-ink">text</code> and <code className="text-ink">channel_id</code>, optionally{" "}
        <code className="text-ink">link</code>, <code className="text-ink">kind</code> and{" "}
        <code className="text-ink">run_at</code> (ISO 8601). Rows without a run_at go into that channel's next queue
        slot.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <OutlineButton type="button" onClick={() => inputRef.current?.click()}>
          {file ? "Choose another file" : "Choose a CSV"}
        </OutlineButton>
        {file && <span className="text-[13px] text-ink">{file.name}</span>}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setResult(null)
            e.target.value = ""
          }}
        />
        <PrimaryButton type="button" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
          {upload.isPending ? "Importing…" : "Import"}
        </PrimaryButton>
      </div>
      {result && (
        <div className="mt-6 border-l border-hair pl-5" aria-live="polite">
          <p className="text-[14px] text-ink">
            {result.created} {result.created === 1 ? "post" : "posts"} scheduled
            {result.errors.length > 0 && `, ${result.errors.length} ${result.errors.length === 1 ? "row" : "rows"} skipped`}.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {result.errors.map((e) => (
                <li key={e.row} className="text-rust">
                  Row {e.row}: {typeof e.detail === "string" ? e.detail : Array.isArray(e.detail) ? e.detail.join(" ") : JSON.stringify(e.detail)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Block>
  )
}
