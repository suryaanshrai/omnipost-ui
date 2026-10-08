import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import HealthDot from "@/components/app/HealthDot"
import { OutlineButton, PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import ConfirmDialog from "@/components/editorial/ConfirmDialog"
import Field, { SelectField } from "@/components/editorial/Field"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { healthLabel } from "@/lib/connectors"
import { formatStamp, timezoneOptions, WEEKDAYS } from "@/lib/format"
import { useConnectors } from "@/lib/queries"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { BestTime, Channel, QueueSlot } from "@/types/api"

export default function ChannelDetail() {
  const { id } = useParams()
  const channelId = Number(id)
  const { activeWorkspace } = useWorkspace()
  const connectors = useConnectors()

  const channel = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => apiFetch<Channel>(`/channels/${channelId}/`),
    enabled: Number.isFinite(channelId),
  })

  if (channel.isLoading) return <p className="eyebrow">Loading…</p>
  if (channel.isError || !channel.data || channel.data.workspace !== activeWorkspace.id) {
    return (
      <div className="max-w-[760px]">
        <SectionHeader eyebrow="04 · Accounts" title="Channel not found" />
        <p className="mt-8 text-[15px] text-ink-55">
          It may have been removed, or it belongs to another workspace.{" "}
          <Link to="/app/connections" className="text-ink underline underline-offset-4 hover:text-rust">
            Back to connections
          </Link>
          .
        </p>
      </div>
    )
  }

  const ch = channel.data
  const connector = connectors.data?.find((c) => c.slug === ch.connector_slug)

  return (
    <div className="max-w-[760px]">
      <Link to="/app/connections" className="eyebrow hover:text-rust">
        ← Connections
      </Link>
      <SectionHeader
        className="mt-6"
        eyebrow={connector?.display_name ?? ch.connector_slug}
        title={ch.display_name}
        aside={
          <span className="inline-flex items-center gap-2">
            <HealthDot health={ch.health} />
            {healthLabel(ch.health)}
          </span>
        }
      />

      <HealthBlock channel={ch} />
      <SettingsBlock channel={ch} />
      <QueueSlotsBlock channel={ch} />
      <BestTimesBlock channel={ch} />
      <DangerBlock channel={ch} />
    </div>
  )
}

function Block({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <div className="flex items-end justify-between border-b border-hair pb-4">
        <h2 className="eyebrow text-ink">{title}</h2>
        {aside && <span className="eyebrow">{aside}</span>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function HealthBlock({ channel }: { channel: Channel }) {
  const expires = channel.token_expires_at ? new Date(channel.token_expires_at) : null
  const soon = expires && expires.getTime() - Date.now() < 7 * 24 * 3600_000
  return (
    <Block title="Health">
      <dl className="grid grid-cols-[140px_1fr] gap-y-3 text-[14px]">
        <dt className="eyebrow pt-0.5">Status</dt>
        <dd className={cn(channel.health === "healthy" ? "text-ink" : "text-rust")}>
          {healthLabel(channel.health)}
          {channel.health_detail && <span className="block text-[13px] text-ink-55">{channel.health_detail}</span>}
        </dd>
        <dt className="eyebrow pt-0.5">Access token</dt>
        <dd className={cn(soon ? "text-rust" : "text-ink")}>
          {expires ? `${expires < new Date() ? "Expired" : "Expires"} ${formatStamp(channel.token_expires_at)}` : "Doesn't expire"}
        </dd>
        <dt className="eyebrow pt-0.5">Connected</dt>
        <dd className="text-ink">{formatStamp(channel.created_at)}</dd>
      </dl>
    </Block>
  )
}

function SettingsBlock({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const [tz, setTz] = useState(channel.timezone ?? "")
  const [gap, setGap] = useState(String(channel.min_gap_minutes ?? 0))
  const [error, setError] = useState<ApiError | null>(null)
  const zones = useMemo(timezoneOptions, [])

  useEffect(() => {
    setTz(channel.timezone ?? "")
    setGap(String(channel.min_gap_minutes ?? 0))
  }, [channel.timezone, channel.min_gap_minutes])

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Channel>(`/channels/${channel.id}/`, {
        method: "PATCH",
        body: { timezone: tz.trim(), min_gap_minutes: Math.max(0, Number(gap) || 0) },
      }),
    onSuccess: (updated) => {
      setError(null)
      queryClient.setQueryData(["channel", channel.id], updated)
      queryClient.invalidateQueries({ queryKey: ["channels", activeWorkspace.id] })
      toast("Channel settings saved")
    },
    onError: (err) => setError(err instanceof ApiError ? err : null),
  })

  const dirty = tz !== (channel.timezone ?? "") || gap !== String(channel.min_gap_minutes ?? 0)

  return (
    <Block title="Scheduling">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
        className="grid gap-7 sm:grid-cols-2"
      >
        <Field
          label="Timezone"
          list="omni-timezones"
          placeholder={`Workspace default (${activeWorkspace.timezone || "UTC"})`}
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          errors={error?.fieldErrors.timezone}
          hint="Queue slots are read in this timezone."
        />
        <datalist id="omni-timezones">
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        <Field
          label="Minimum gap (minutes)"
          type="number"
          min={0}
          value={gap}
          onChange={(e) => setGap(e.target.value)}
          errors={error?.fieldErrors.min_gap_minutes}
          hint="The queue never places two posts on this channel closer than this."
        />
        <div className="sm:col-span-2">
          <PrimaryButton type="submit" disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </PrimaryButton>
          {error && !error.fieldErrors.timezone && !error.fieldErrors.min_gap_minutes && (
            <p className="mt-3 text-[13px] text-rust">{error.detail}</p>
          )}
        </div>
      </form>
    </Block>
  )
}

function QueueSlotsBlock({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient()
  const key = ["queue-slots", channel.id]
  const slots = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<Page<QueueSlot>>(`/queue-slots/?channel=${channel.id}&limit=200`),
    select: (page) => page.results,
  })
  const [weekday, setWeekday] = useState("0")
  const [time, setTime] = useState("09:00")
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key })
    queryClient.invalidateQueries({ queryKey: ["queue-slots-all"] })
  }

  const add = useMutation({
    mutationFn: () =>
      apiFetch<QueueSlot>("/queue-slots/", {
        method: "POST",
        body: { channel: channel.id, weekday: Number(weekday), time_of_day: time },
      }),
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (err) =>
      setError(
        err instanceof ApiError
          ? /unique/i.test(err.detail)
            ? "There's already a slot at that time."
            : err.detail
          : "Could not add the slot."
      ),
  })
  const toggle = useMutation({
    mutationFn: (slot: QueueSlot) =>
      apiFetch(`/queue-slots/${slot.id}/`, { method: "PATCH", body: { is_active: !slot.is_active } }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (slot: QueueSlot) => apiFetch(`/queue-slots/${slot.id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate()
  }

  const list = slots.data ?? []

  return (
    <Block title="Queue slots" aside={`${list.length} weekly`}>
      <p className="max-w-[560px] text-[14px] leading-[1.6] text-ink-55">
        "Add to queue" places a draft in this channel's next open slot, skipping blackout windows.
      </p>
      {list.length > 0 && (
        <ul className="mt-5 border-t border-hair">
          {list.map((slot) => (
            <li key={slot.id} className="flex items-center gap-4 border-b border-hair py-3 text-[14px]">
              <span className={cn("w-12 font-semibold", !slot.is_active && "text-ink-38")}>{WEEKDAYS[slot.weekday]}</span>
              <span className={cn("flex-1 tabular-nums", !slot.is_active && "text-ink-38 line-through")}>
                {slot.time_of_day.slice(0, 5)}
              </span>
              <TextButton type="button" tone="muted" onClick={() => toggle.mutate(slot)}>
                {slot.is_active ? "Pause" : "Resume"}
              </TextButton>
              <TextButton type="button" tone="muted" onClick={() => remove.mutate(slot)}>
                Remove
              </TextButton>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-6 flex flex-wrap items-end gap-6">
        <SelectField label="Day" value={weekday} onChange={(e) => setWeekday(e.target.value)} className="w-32">
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </SelectField>
        <Field label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32" />
        <OutlineButton type="submit" disabled={add.isPending || !time}>
          Add slot
        </OutlineButton>
      </form>
      {error && <p className="mt-3 text-[13px] text-rust">{error}</p>}
    </Block>
  )
}

function BestTimesBlock({ channel }: { channel: Channel }) {
  const best = useQuery({
    queryKey: ["best-times", channel.id],
    queryFn: () => apiFetch<BestTime[]>(`/channels/${channel.id}/best-times/`),
  })
  const rows = best.data ?? []
  const top = rows.reduce((m, r) => Math.max(m, r.avg_engagement), 0)

  return (
    <Block title="Best times to post">
      {best.isLoading && <p className="eyebrow">Loading…</p>}
      {best.isSuccess && rows.length === 0 && (
        <p className="max-w-[560px] text-[14px] leading-[1.6] text-ink-55">
          Not enough history yet. Suggestions need at least five published posts on this channel, and engagement
          numbers from the platform (today only Bluesky and Mastodon report them).
        </p>
      )}
      {rows.length > 0 && (
        <ul className="border-t border-hair">
          {rows.map((r) => (
            <li key={`${r.weekday}-${r.hour}`} className="grid grid-cols-[110px_1fr_auto] items-center gap-4 border-b border-hair py-3 text-[14px]">
              <span className="font-semibold">
                {WEEKDAYS[r.weekday]} · {String(r.hour).padStart(2, "0")}:00
              </span>
              <span className="h-[3px] bg-rust" style={{ width: `${top ? (r.avg_engagement / top) * 100 : 0}%` }} />
              <span className="eyebrow">
                {r.avg_engagement.toFixed(1)} avg · {r.sample_size} posts
              </span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  )
}

function DangerBlock({ channel }: { channel: Channel }) {
  const [confirm, setConfirm] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const remove = useMutation({
    mutationFn: () => apiFetch(`/channels/${channel.id}/`, { method: "DELETE" }),
    onSuccess: () => {
      toast(`${channel.display_name} removed`)
      queryClient.invalidateQueries({ queryKey: ["channels", activeWorkspace.id] })
      navigate("/app/connections", { replace: true })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "Could not remove the channel."),
  })
  return (
    <Block title="Remove">
      <TextButton type="button" tone="rust" onClick={() => setConfirm(true)}>
        Remove this channel
      </TextButton>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        eyebrow="Remove"
        title={`Remove ${channel.display_name}?`}
        description="Its credentials, queue slots and recurrence rules are deleted, and so is its delivery history on every post. Anything already published stays up on the platform."
        confirmLabel="Remove"
        tone="rust"
        onConfirm={() => remove.mutate()}
        pending={remove.isPending}
      />
    </Block>
  )
}
