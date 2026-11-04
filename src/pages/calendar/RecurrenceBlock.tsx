import { useState } from "react"
import { Link } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { kindLabel, POST_KINDS } from "@/components/compose/compose-context"
import { OutlineButton, TextButton } from "@/components/editorial/Buttons"
import Field, { SelectField, TextareaField } from "@/components/editorial/Field"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { formatStamp, fromLocalInput } from "@/lib/format"
import { useChannels } from "@/lib/queries"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { PostKind, RecurrenceRule } from "@/types/api"


export function RecurrenceBlock() {
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
              <TextButton type="button" tone="muted" onClick={() => window.confirm("Remove this? It can't be undone.") && remove.mutate(r)}>
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
