import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { ChannelToggle } from "@/components/app/ChannelChip"
import { PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import Field from "@/components/editorial/Field"
import Modal from "@/components/editorial/Modal"
import { apiFetch, ApiError } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { useChannels } from "@/lib/queries"
import { useWorkspace } from "@/lib/workspace"
import type { Feed, Webhook } from "@/types/api"
import { useWorkspaceList } from "./shared"

const EVENTS = [
  { value: "post.published", label: "Post published" },
  { value: "post.failed", label: "Post failed" },
  { value: "channel.broken", label: "Account needs reconnecting" },
]

/** Webhooks out (Zapier, n8n, your own code) and RSS feeds in. */
export default function IntegrationsBlock() {
  return (
    <>
      <WebhooksBlock />
      <FeedsBlock />
    </>
  )
}

function WebhooksBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const hooks = useWorkspaceList<Webhook>("webhooks")
  const [url, setUrl] = useState("")
  const [events, setEvents] = useState<string[]>(EVENTS.map((e) => e.value))
  const [error, setError] = useState<ApiError | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["webhooks", activeWorkspace.id] })

  const add = useMutation({
    mutationFn: () =>
      apiFetch<Webhook & { secret: string }>("/webhooks/", {
        method: "POST",
        body: { workspace: activeWorkspace.id, url: url.trim(), events },
      }),
    onSuccess: (hook) => {
      setUrl("")
      setError(null)
      setSecret(hook.secret)
      void invalidate()
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not add the webhook.")),
  })
  const test = useMutation({
    mutationFn: (h: Webhook) => apiFetch(`/webhooks/${h.id}/test/`, { method: "POST" }),
    onSuccess: () => {
      toast("Ping sent")
      window.setTimeout(() => void invalidate(), 2000)
    },
  })
  const remove = useMutation({
    mutationFn: (h: Webhook) => apiFetch(`/webhooks/${h.id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate()
  }

  return (
    <Block title="Webhooks" aside="For Zapier, n8n or your own code">
      <p className="-mt-2 text-[14px] leading-[1.6] text-ink-55">
        OmniPost POSTs a signed JSON event to your URL. Verify it with the secret: the
        <code className="mx-1">X-OmniPost-Signature</code> header is <code>sha256=</code> HMAC of
        <code className="mx-1">timestamp.body</code>.
      </p>
      <ul className="mt-4">
        {(hooks.data ?? []).map((h) => (
          <li key={h.id} className="flex flex-wrap items-center gap-4 border-b border-hair py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{h.url}</span>
              <span className="eyebrow mt-1 block">
                {(h.events?.length ? h.events : EVENTS.map((e) => e.value)).join(" · ")}
                {h.last_delivered_at && ` · last: ${h.last_status} ${formatStamp(h.last_delivered_at)}`}
              </span>
            </span>
            <TextButton type="button" onClick={() => test.mutate(h)}>
              Send test
            </TextButton>
            <TextButton
              type="button"
              tone="muted"
              onClick={() => window.confirm("Remove this webhook?") && remove.mutate(h)}
            >
              Remove
            </TextButton>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
        <Field
          label="URL"
          type="url"
          placeholder="https://hooks.example.com/omnipost"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          errors={error?.fieldErrors.url ?? (error && !Object.keys(error.fieldErrors).length ? [error.detail] : undefined)}
        />
        <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
          <legend className="eyebrow mb-2">Send</legend>
          {EVENTS.map((ev) => (
            <label key={ev.value} className="flex items-center gap-2 text-[13.5px]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--rust)]"
                checked={events.includes(ev.value)}
                onChange={(e) =>
                  setEvents((prev) => (e.target.checked ? [...prev, ev.value] : prev.filter((x) => x !== ev.value)))
                }
              />
              {ev.label}
            </label>
          ))}
        </fieldset>
        <PrimaryButton type="submit" className="self-start" disabled={!url.trim() || !events.length || add.isPending}>
          {add.isPending ? "Adding…" : "Add webhook"}
        </PrimaryButton>
      </form>
      <Modal
        open={!!secret}
        onOpenChange={(o) => !o && setSecret(null)}
        eyebrow="Webhook added"
        title="Copy the signing secret"
        description="It's shown only this once. Use it to check that events really come from OmniPost."
        footer={
          <>
            <span />
            <PrimaryButton type="button" onClick={() => setSecret(null)}>
              Done
            </PrimaryButton>
          </>
        }
      >
        <code className="block border border-hair p-3 text-[13px] break-all select-all">{secret}</code>
      </Modal>
    </Block>
  )
}

function FeedsBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const feeds = useWorkspaceList<Feed>("feeds")
  const channels = useChannels()
  const [url, setUrl] = useState("")
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["feeds", activeWorkspace.id] })

  const add = useMutation({
    mutationFn: () =>
      apiFetch<Feed>("/feeds/", {
        method: "POST",
        body: { workspace: activeWorkspace.id, url: url.trim(), channels: selected },
      }),
    onSuccess: () => {
      setUrl("")
      setSelected([])
      setError(null)
      toast("Feed added. New items will show up in Drafts.")
      void invalidate()
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not add the feed.")),
  })
  const remove = useMutation({
    mutationFn: (f: Feed) => apiFetch(`/feeds/${f.id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  })
  const name = (id: number) => channels.data?.find((c) => c.id === id)?.display_name ?? "a channel"

  const submit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate()
  }

  return (
    <Block title="Feeds" aside="RSS or Atom → Drafts">
      <p className="-mt-2 text-[14px] leading-[1.6] text-ink-55">
        Each new item in a feed (your blog, a newsletter) becomes a draft for the channels you pick. Nothing is
        published until you send it. Items already in the feed when you add it are skipped.
      </p>
      <ul className="mt-4">
        {(feeds.data ?? []).map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-4 border-b border-hair py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{f.url}</span>
              <span className="eyebrow mt-1 block">
                {f.channels?.length ? `To ${f.channels.map(name).join(", ")}` : "No channels yet"}
                {f.last_checked_at && ` · checked ${formatStamp(f.last_checked_at)}`}
              </span>
              {f.last_error && <span className="mt-1 block text-[13px] text-rust">{f.last_error}</span>}
            </span>
            <TextButton type="button" tone="muted" onClick={() => window.confirm("Remove this feed?") && remove.mutate(f)}>
              Remove
            </TextButton>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
        <Field
          label="Feed URL"
          type="url"
          placeholder="https://yourblog.com/feed.xml"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          errors={error?.fieldErrors.url ?? (error && !Object.keys(error.fieldErrors).length ? [error.detail] : undefined)}
        />
        <div>
          <div className="eyebrow mb-2">Drafts for</div>
          <div className="flex flex-wrap gap-2">
            {(channels.data ?? []).map((c) => (
              <ChannelToggle
                key={c.id}
                channel={c}
                selected={selected.includes(c.id)}
                onToggle={() => setSelected((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}
              />
            ))}
            {channels.isSuccess && !channels.data.length && (
              <span className="text-[13px] text-ink-55">Connect an account first.</span>
            )}
          </div>
        </div>
        <PrimaryButton type="submit" className="self-start" disabled={!url.trim() || add.isPending}>
          {add.isPending ? "Adding…" : "Add feed"}
        </PrimaryButton>
      </form>
    </Block>
  )
}
