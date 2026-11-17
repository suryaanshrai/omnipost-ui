// Date/number formatting shared across the app, in the design's register
// ("Aug 24 · 10:00 AM", "02 Oct, 14:05").
//
// Times show in the active workspace's time zone (WorkspaceProvider calls
// setDisplayTimeZone), so a post scheduled for "9:00" means 9:00 where the
// workspace is, whoever's browser is looking at it.

export const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

let displayTimeZone = BROWSER_TIME_ZONE

export function setDisplayTimeZone(tz: string | null | undefined): void {
  displayTimeZone = tz && isValidTimeZone(tz) ? tz : BROWSER_TIME_ZONE
}

export function getDisplayTimeZone(): string {
  return displayTimeZone
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>()
function fmt(locale: string, options: Intl.DateTimeFormatOptions, tz = displayTimeZone): Intl.DateTimeFormat {
  const key = `${locale}|${tz}|${JSON.stringify(options)}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...options, timeZone: tz })
    formatters.set(key, f)
  }
  return f
}

/** "Aug 24 · 10:00 AM" */
export function formatStamp(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  return `${fmt("en-US", { month: "short", day: "numeric" }).format(d)} · ${fmt("en-US", { hour: "numeric", minute: "2-digit" }).format(d)}`
}

/** "02 Oct, 14:05" — the sidebar's live clock. */
export function formatClock(d: Date): string {
  return fmt("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d)
}

/** Wall-clock parts of an instant in a time zone. */
function wallParts(ms: number, tz: string) {
  const parts = fmt(
    "en-US",
    { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
    tz
  ).formatToParts(new Date(ms))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") }
}

/** An instant as the value a <input type="datetime-local"> expects, in the display time zone. */
export function toLocalInput(iso: string | null | undefined, tz = displayTimeZone): string {
  if (!iso) return ""
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) return ""
  const { y, m, d, h, min } = wallParts(ms, tz)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`
}

/** The inverse: a datetime-local value, read as wall time in the display time zone → ISO (UTC). */
export function fromLocalInput(value: string, tz = displayTimeZone): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const [y, mo, d, h, mi] = match.slice(1).map(Number)
  const asUtc = Date.UTC(y, mo - 1, d, h, mi)
  // The zone's offset at that moment; re-check once so a DST change between
  // the guess and the answer doesn't leave it an hour off.
  const offsetAt = (ms: number) => {
    const w = wallParts(ms, tz)
    return Date.UTC(w.y, w.m - 1, w.d, w.h, w.min) - ms
  }
  let ms = asUtc - offsetAt(asUtc)
  ms = asUtc - offsetAt(ms)
  return new Date(ms).toISOString()
}

/** "Europe/London" → "London", for short labels next to times. */
export function timeZoneLabel(tz = displayTimeZone): string {
  return tz.split("/").pop()?.replace(/_/g, " ") ?? tz
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Every IANA timezone the browser knows, for a timezone <datalist>. */
export function timezoneOptions(): string[] {
  try {
    // ES2022 API; the app targets ES2020 lib typings.
    return (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone")
  } catch {
    return []
  }
}
