// Date/number formatting shared across the app, in the design's register
// ("Aug 24 · 10:00 AM", "02 Oct, 14:05").

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })

/** "Aug 24 · 10:00 AM" */
export function formatStamp(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  return `${dateTime.format(d)} · ${time.format(d)}`
}

const clock = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

/** "02 Oct, 14:05" — the sidebar's live clock. */
export function formatClock(d: Date): string {
  return clock.format(d)
}

/** A Date as the value a <input type="datetime-local"> expects, in local time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** The inverse: a datetime-local value (local time, no offset) → ISO with offset. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
