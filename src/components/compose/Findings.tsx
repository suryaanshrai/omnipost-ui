import type { Channel, ValidateResult } from "@/types/api"
import { cn } from "@/lib/utils"

/** Characters used against each selected network's limit (its own text when it has an override). */
export function CharCounts({
  channels,
  text,
  overrides,
  connectors,
}: {
  channels: Channel[]
  text: string
  overrides: Record<number, string>
  connectors: Map<string, { max_text_length: number | null; display_name: string }>
}) {
  const rows = channels
    .map((c) => ({ channel: c, max: connectors.get(c.connector_slug)?.max_text_length ?? null }))
    .filter((r): r is { channel: Channel; max: number } => r.max != null)
  if (!rows.length) return null
  // Several channels with the same limit and no overrides read as one count.
  const distinct = new Set(rows.map((r) => `${r.max}:${overrides[r.channel.id] ?? ""}`))
  if (distinct.size === 1 && !overrides[rows[0].channel.id]) {
    const max = rows[0].max
    return (
      <div className={cn("eyebrow mt-2 text-right", text.length > max && "text-rust")}>
        {text.length} / {max}
      </div>
    )
  }
  return (
    <ul className="mt-2 flex flex-wrap justify-end gap-x-4 gap-y-1" aria-label="Characters per channel">
      {rows.map(({ channel, max }) => {
        const used = (overrides[channel.id] ?? text).length
        return (
          <li key={channel.id} className={cn("eyebrow", used > max && "text-rust")}>
            {channel.display_name} {used} / {max}
          </li>
        )
      })}
    </ul>
  )
}

export function Findings({
  channels,
  results,
  validating,
}: {
  channels: Channel[]
  results: (ValidateResult | undefined)[]
  validating: boolean
}) {
  const rows = channels
    .map((c, i) => ({ channel: c, result: results[i] }))
    .filter((r) => r.result && r.result.findings.length > 0)
  if (!rows.length) {
    return channels.length ? (
      <p className="eyebrow" aria-live="polite">
        {validating ? "Checking each channel…" : "Every selected channel accepts this."}
      </p>
    ) : null
  }
  return (
    <div className="border-l border-hair pl-5" aria-live="polite">
      <div className="eyebrow mb-3">Per-channel checks</div>
      <ul className="space-y-3">
        {rows.map(({ channel, result }) => (
          <li key={channel.id} className="text-[13px] leading-[1.5]">
            <span className="font-semibold text-ink">{channel.display_name}</span>
            <ul className="mt-1 space-y-1">
              {result!.findings.map((f, i) => (
                <li key={i} className={f.blocking ? "text-rust" : "text-ink-55"}>
                  {f.blocking ? "✕ " : "· "}
                  {f.message}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
