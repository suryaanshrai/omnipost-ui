import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChannelChip, ChannelToggle } from "@/components/app/ChannelChip"
import MediaBand from "@/components/app/MediaBand"
import { kindLabel, useCompose } from "@/components/compose/compose-context"
import { PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import ConfirmDialog from "@/components/editorial/ConfirmDialog"
import Reveal from "@/components/editorial/Reveal"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { isDue, targetSpecsFor } from "@/lib/posts"
import { useChannels, useConnectors } from "@/lib/queries"
import { useSectionEyebrow } from "@/lib/nav"
import { useWorkspace } from "@/lib/workspace"
import type { Channel, Connector, Post } from "@/types/api"

const EDITABLE = new Set(["draft", "failed"])

export default function Drafts() {
  const eyebrow = useSectionEyebrow("/app/drafts", "Waiting")
  const { activeWorkspace } = useWorkspace()
  const channels = useChannels()
  const connectors = useConnectors()

  const drafts = useQuery({
    queryKey: ["posts", activeWorkspace.id, "drafts"],
    queryFn: () =>
      apiFetch<Page<Post>>(`/posts/?workspace=${activeWorkspace.id}&status=draft,in_review,approved,scheduled&limit=100`),
    // A scheduled post that's already due is on its way out — it belongs to Posts now.
    select: (page) => page.results.filter((p) => !(p.status === "scheduled" && isDue(p))),
  })

  const list = drafts.data ?? []

  return (
    <div className="max-w-[760px]">
      <SectionHeader eyebrow={eyebrow} title="Drafts" aside={`${list.length} waiting`} />

      {drafts.isLoading && <p className="eyebrow mt-10">Loading…</p>}
      {drafts.isError && (
        <p className="mt-10 text-[14px] text-rust">
          {drafts.error instanceof ApiError ? drafts.error.detail : "Could not load your drafts."}
        </p>
      )}
      {drafts.isSuccess && list.length === 0 && (
        <p className="mt-10 text-[15px] text-ink-55">Nothing waiting. Anything you save from Compose lands here.</p>
      )}

      {list.map((post, i) => (
        <Reveal key={post.id} delayMs={Math.min(i, 6) * 70}>
          <DraftEntry post={post} channels={channels.data ?? []} connectors={connectors.data ?? []} />
        </Reveal>
      ))}
    </div>
  )
}

function scheduleLabel(post: Post): string {
  if (post.status === "scheduled") return `Scheduled · ${formatStamp(post.scheduled_for)}`
  if (post.status === "in_review") return "In review"
  if (post.status === "approved") return post.scheduled_for ? `Approved · for ${formatStamp(post.scheduled_for)}` : "Approved"
  return post.scheduled_for ? `For ${formatStamp(post.scheduled_for)}` : "Unscheduled"
}

function DraftEntry({ post, channels, connectors }: { post: Post; channels: Channel[]; connectors: Connector[] }) {
  const { activeWorkspace } = useWorkspace()
  const { openCompose } = useCompose()
  const queryClient = useQueryClient()
  const workflow = !!activeWorkspace.approval_workflow_enabled
  const editable = EDITABLE.has(post.status)

  // Channel selection is local-first: toggles apply instantly and a
  // debounced PATCH (replace-all target_specs) follows.
  const [selected, setSelected] = useState<number[]>(() => post.targets.map((t) => t.channel))
  const serverKey = post.targets.map((t) => t.channel).join(",")
  const pendingRef = useRef<{ timer: number; ids: number[] } | null>(null)
  useEffect(() => {
    if (!pendingRef.current) setSelected(serverKey ? serverKey.split(",").map(Number) : [])
  }, [serverKey])

  const [confirm, setConfirm] = useState<null | "dispatch" | "delete" | "cancel">(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
  }

  const patchTargets = useMutation({
    mutationFn: (ids: number[]) =>
      apiFetch<Post>(`/posts/${post.id}/`, { method: "PATCH", body: { target_specs: targetSpecsFor(post, ids) } }),
    onSuccess: invalidate,
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.detail : "Could not update the channels.")
      setSelected(post.targets.map((t) => t.channel))
    },
  })

  /** Saves a toggle still waiting on its debounce, returning the updated post if there was one. */
  const flush = async (): Promise<Post | undefined> => {
    const pending = pendingRef.current
    if (!pending) return undefined
    window.clearTimeout(pending.timer)
    pendingRef.current = null
    return patchTargets.mutateAsync(pending.ids)
  }

  useEffect(
    () => () => {
      // Unmounting mid-debounce (navigating away) still saves the last toggle.
      const pending = pendingRef.current
      if (pending) {
        window.clearTimeout(pending.timer)
        apiFetch(`/posts/${post.id}/`, { method: "PATCH", body: { target_specs: targetSpecsFor(post, pending.ids) } }).catch(() => {})
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount-only flush
    []
  )

  const toggle = (id: number) => {
    const next = selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id]
    setSelected(next)
    if (pendingRef.current) window.clearTimeout(pendingRef.current.timer)
    const timer = window.setTimeout(() => {
      pendingRef.current = null
      patchTargets.mutate(next)
    }, 600)
    pendingRef.current = { timer, ids: next }
  }

  const action = useMutation({
    mutationFn: async (kind: "dispatch" | "queue" | "submit" | "delete" | "cancel") => {
      await flush()
      if (kind === "delete") return apiFetch(`/posts/${post.id}/`, { method: "DELETE" })
      if (kind === "cancel") return apiFetch(`/posts/${post.id}/cancel/`, { method: "POST" })
      if (kind === "submit") return apiFetch(`/posts/${post.id}/submit-for-review/`, { method: "POST" })
      if (kind === "queue") return apiFetch(`/posts/${post.id}/queue/`, { method: "POST" })
      const future = post.scheduled_for && new Date(post.scheduled_for).getTime() > Date.now()
      return apiFetch(`/posts/${post.id}/schedule/`, {
        method: "POST",
        body: { run_at: future ? post.scheduled_for : new Date().toISOString() },
      })
    },
    onSuccess: (_data, kind) => {
      setConfirm(null)
      invalidate()
      queryClient.invalidateQueries({ queryKey: ["calendar"] })
      const future = post.scheduled_for && new Date(post.scheduled_for).getTime() > Date.now()
      toast(
        {
          dispatch: future ? `Scheduled for ${formatStamp(post.scheduled_for)}` : "Dispatched",
          queue: "Added to the queue",
          submit: "Submitted for review",
          delete: "Draft deleted",
          cancel: "Schedule canceled",
        }[kind]
      )
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "That didn't go through."),
  })

  const connectorBySlug = new Map(connectors.map((c) => [c.slug, c]))
  const eligible = channels.filter(
    (c) => selected.includes(c.id) || connectorBySlug.get(c.connector_slug)?.post_kinds.includes(post.kind ?? "text")
  )
  const selectedChannels = channels.filter((c) => selected.includes(c.id))
  const future = !!post.scheduled_for && new Date(post.scheduled_for).getTime() > Date.now()
  const canDispatch = workflow ? post.status === "approved" || post.status === "failed" : editable
  const busy = action.isPending

  return (
    <article className="border-b border-hair py-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="eyebrow text-rust">{kindLabel(post.kind)}</span>
        <span className="eyebrow">{scheduleLabel(post)}</span>
      </div>

      {!!post.base_media?.length && <MediaBand mediaId={post.base_media[0]} className="mt-6" />}

      {post.base_text ? (
        <p className="mt-5 max-w-[600px] text-[17px] leading-[1.6] text-pretty whitespace-pre-line text-ink">{post.base_text}</p>
      ) : (
        <p className="mt-5 text-[15px] text-ink-45 italic">No caption yet.</p>
      )}

      <div className="eyebrow mt-7 mb-3">Publish to</div>
      {editable ? (
        eligible.length ? (
          <div className="flex flex-wrap gap-2">
            {eligible.map((c) => (
              <ChannelToggle key={c.id} channel={c} selected={selected.includes(c.id)} onToggle={() => toggle(c.id)} />
            ))}
          </div>
        ) : (
          <p className="text-[13.5px] text-ink-55">
            No connected channel takes {kindLabel(post.kind).toLowerCase()} posts.{" "}
            <Link to="/app/connections" className="text-ink underline underline-offset-4 hover:text-rust">
              Connect one
            </Link>
            .
          </p>
        )
      ) : (
        <div className="flex flex-wrap gap-2">
          {post.targets.map((t) => (
            <ChannelChip key={t.id} channel={channels.find((c) => c.id === t.channel)} />
          ))}
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
        {post.status === "scheduled" ? (
          <TextButton type="button" tone="rust" onClick={() => setConfirm("cancel")} disabled={busy}>
            Cancel schedule
          </TextButton>
        ) : (
          <>
            {canDispatch && (
              <PrimaryButton type="button" onClick={() => setConfirm("dispatch")} disabled={busy || selected.length === 0}>
                {future ? "Schedule" : "Dispatch now"}
              </PrimaryButton>
            )}
            {workflow && post.status === "draft" && (
              <PrimaryButton type="button" onClick={() => action.mutate("submit")} disabled={busy || selected.length === 0}>
                Submit for review
              </PrimaryButton>
            )}
            {canDispatch && (
              <TextButton type="button" onClick={() => action.mutate("queue")} disabled={busy || selected.length === 0}>
                Add to queue
              </TextButton>
            )}
            {editable && (
              <TextButton
                type="button"
                onClick={async () => {
                  const updated = await flush()
                  openCompose({ post: updated ?? post })
                }}
                disabled={busy}
              >
                Edit
              </TextButton>
            )}
            {post.status !== "in_review" && (
              <TextButton type="button" tone="muted" onClick={() => setConfirm("delete")} disabled={busy}>
                Delete
              </TextButton>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm === "dispatch"}
        onOpenChange={(o) => !o && setConfirm(null)}
        eyebrow={future ? "Schedule" : "Dispatch"}
        title={future ? "Schedule this draft" : "Dispatch this draft"}
        description={
          future
            ? `It goes out ${formatStamp(post.scheduled_for)} to:`
            : "It goes out now to:"
        }
        confirmLabel={future ? "Schedule" : "Dispatch"}
        onConfirm={() => action.mutate("dispatch")}
        pending={busy}
      >
        <div className="flex flex-wrap gap-2">
          {selectedChannels.map((c) => (
            <ChannelChip key={c.id} channel={c} />
          ))}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        eyebrow="Delete"
        title="Delete this draft?"
        description="It can't be brought back."
        confirmLabel="Delete"
        tone="rust"
        onConfirm={() => action.mutate("delete")}
        pending={busy}
      />

      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(o) => !o && setConfirm(null)}
        eyebrow="Cancel"
        title="Cancel this schedule?"
        description="Every channel that hasn't published yet is canceled, and the post won't go out."
        confirmLabel="Cancel schedule"
        tone="rust"
        onConfirm={() => action.mutate("cancel")}
        pending={busy}
      />
    </article>
  )
}
