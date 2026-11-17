import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch, ApiError } from "@/lib/api"
import { fromLocalInput, toLocalInput } from "@/lib/format"
import { targetSpecsFor } from "@/lib/posts"
import { useChannels, useConnectors } from "@/lib/queries"
import { useDebounced } from "@/lib/use-debounced"
import { useWorkspace } from "@/lib/workspace"
import type { Channel, Connector, MediaAsset, Post, PostKind, PostTargetWrite, ValidateResult } from "@/types/api"

export type SaveOutcome = "draft" | "review" | "scheduled" | "sent"

function assetKind(file: File): "image" | "video" | "gif" {
  if (file.type.startsWith("video/")) return "video"
  if (file.type === "image/gif") return "gif"
  return "image"
}

/** The thread replies and first comment a saved post already has. */
function initialExtras(post?: Post) {
  const threaded = post?.targets.find((t) => (t.parts?.length ?? 0) > 1)
  const parts = threaded ? [...threaded.parts].sort((a, b) => a.sequence - b.sequence).slice(1).map((p) => p.text ?? "") : []
  const firstComment = post?.targets.find((t) => t.first_comment)?.first_comment ?? ""
  return { parts, firstComment }
}

/**
 * Everything the composer holds and does, without the layout: the draft's
 * fields, live per-channel checks, uploads, and saving (draft, review,
 * schedule or publish now).
 */
export function useComposeDraft({
  post,
  initialKind,
  open,
  onSaved,
}: {
  post?: Post
  initialKind?: PostKind
  open: boolean
  onSaved: (outcome: SaveOutcome) => void
}) {
  const { activeWorkspace } = useWorkspace()
  const channels = useChannels()
  const connectors = useConnectors()
  const queryClient = useQueryClient()
  const editing = !!post
  const extras = useMemo(() => initialExtras(post), [post])

  const [kind, setKind] = useState<PostKind | undefined>(post?.kind ?? initialKind)
  const [text, setText] = useState(post?.base_text ?? "")
  const [link, setLink] = useState(post?.link ?? "")
  const [scheduled, setScheduled] = useState(toLocalInput(post?.scheduled_for))
  const [selected, setSelected] = useState<number[]>(() => post?.targets.map((t) => t.channel) ?? [])
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [overrides, setOverrides] = useState<Record<number, string>>(() =>
    Object.fromEntries((post?.targets ?? []).filter((t) => t.text_override).map((t) => [t.channel, t.text_override!]))
  )
  const [threadParts, setThreadParts] = useState<string[]>(extras.parts)
  const [firstComment, setFirstComment] = useState(extras.firstComment)
  const [uploading, setUploading] = useState(0)
  const [saveError, setSaveError] = useState<ApiError | null>(null)
  // Editing: the draft's media loads asynchronously. Until it has, saving
  // would send an empty list and silently detach it.
  const [mediaReady, setMediaReady] = useState(!post?.base_media?.length)
  const [mediaLoadFailed, setMediaLoadFailed] = useState(false)

  // Editing: hydrate the attached assets (Post.base_media is ids only).
  useEffect(() => {
    if (!post?.base_media?.length) return
    let cancelled = false
    Promise.all(post.base_media.map((id) => apiFetch<MediaAsset>(`/media/${id}/`)))
      .then((assets) => {
        if (cancelled) return
        setMedia(assets)
        setMediaReady(true)
      })
      .catch(() => !cancelled && setMediaLoadFailed(true))
    return () => {
      cancelled = true
    }
  }, [post])

  const connectorBySlug = useMemo(
    () => new Map<string, Connector>((connectors.data ?? []).map((c) => [c.slug, c])),
    [connectors.data]
  )
  const connectorOf = (c: Channel) => connectorBySlug.get(c.connector_slug)
  const eligible = (channels.data ?? []).filter((c) => (kind ? connectorOf(c)?.post_kinds.includes(kind) : false))
  const selectedChannels = eligible.filter((c) => selected.includes(c.id))
  const supportsLink = selectedChannels.some((c) => connectorOf(c)?.supports_link)
  const threadChannels = kind === "text" ? selectedChannels.filter((c) => connectorOf(c)?.supports_threads) : []
  const commentChannels = selectedChannels.filter((c) => connectorOf(c)?.supports_first_comment)
  const threadMax = threadChannels.reduce<number | null>((min, c) => {
    const max = connectorOf(c)?.max_text_length ?? null
    return max == null ? min : min == null ? max : Math.min(min, max)
  }, null)

  // Live per-channel findings, debounced so typing doesn't fire a request per keystroke.
  const liveInput = { text, link: supportsLink ? link : "", media: media.map((m) => m.id), kind, overrides }
  const validateInput = useDebounced(liveInput, 500)
  const findings = useQueries({
    queries: selectedChannels.map((c) => {
      const channelText = validateInput.overrides[c.id] ?? validateInput.text
      return {
        queryKey: ["validate", c.id, validateInput.kind, channelText, validateInput.link, validateInput.media],
        queryFn: () =>
          apiFetch<ValidateResult>("/validate/", {
            method: "POST",
            body: {
              channel: c.id,
              text: channelText,
              post_kind: validateInput.kind ?? "text",
              link: validateInput.link || null,
              media: validateInput.media,
            },
          }),
        enabled: !!validateInput.kind && open,
        staleTime: 30_000,
      }
    }),
  })
  const threadTooLong = threadMax != null && threadParts.some((p) => p.length > threadMax)
  const blocking = threadTooLong || findings.some((f) => f.data?.findings.some((x) => x.blocking))
  // Still typing, or a check is in flight: the findings may be stale.
  const validating = JSON.stringify(validateInput) !== JSON.stringify(liveInput) || findings.some((f) => f.isFetching)

  const upload = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append("workspace", String(activeWorkspace.id))
      form.append("kind", assetKind(file))
      form.append("file", file)
      setUploading((n) => n + 1)
      try {
        const asset = await apiFetch<MediaAsset>("/media/", { method: "POST", body: form })
        setMedia((prev) => [...prev, asset])
      } catch (err) {
        toast.error(err instanceof ApiError ? err.detail : `Could not upload ${file.name}.`)
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  /** One spec per selected channel, with what that network supports. */
  const targetSpecs = (): PostTargetWrite[] => {
    const ids = selectedChannels.map((c) => c.id)
    const base = editing ? targetSpecsFor(post, ids, overrides) : ids.map((channel) => ({ channel }) as PostTargetWrite)
    const replies = threadParts.map((p) => p.trim()).filter(Boolean)
    return base.map((spec) => {
      const channel = selectedChannels.find((c) => c.id === spec.channel)!
      const connector = connectorOf(channel)
      const out: PostTargetWrite = { ...spec }
      if (!editing && overrides[channel.id]) out.text_override = overrides[channel.id]
      if (connector?.supports_first_comment && firstComment.trim()) out.first_comment = firstComment.trim()
      if (kind === "text" && connector?.supports_threads && replies.length) {
        out.parts = [overrides[channel.id] ?? text, ...replies].map((partText, sequence) => ({ sequence, text: partText }))
      }
      return out
    })
  }

  const reviewFirst = !!activeWorkspace.approval_workflow_enabled
  const scheduledFor = fromLocalInput(scheduled)
  const inFuture = !!scheduledFor && new Date(scheduledFor).getTime() > Date.now()

  const save = useMutation({
    mutationFn: async (then: "draft" | "dispatch"): Promise<SaveOutcome> => {
      const body: Record<string, unknown> = { kind, base_text: text, scheduled_for: scheduledFor, target_specs: targetSpecs() }
      // Never send a media list we haven't loaded: that would detach it.
      if (mediaReady) body.base_media = media.map((m) => m.id)
      if (link || editing) body.link = supportsLink ? link : ""
      let saved: Post
      if (editing) {
        saved = await apiFetch<Post>(`/posts/${post.id}/`, { method: "PATCH", body })
      } else {
        body.workspace = activeWorkspace.id
        saved = await apiFetch<Post>("/posts/", { method: "POST", body })
      }
      if (then === "draft") return "draft"
      if (reviewFirst) {
        await apiFetch(`/posts/${saved.id}/submit-for-review/`, { method: "POST" })
        return "review"
      }
      try {
        await apiFetch(`/posts/${saved.id}/schedule/`, { method: "POST", body: inFuture ? { run_at: scheduledFor } : {} })
      } catch (err) {
        // The draft is saved; only the dispatch failed. Say so instead of
        // leaving the user unsure whether anything was kept.
        throw new ApiError(
          err instanceof ApiError ? err.status : 0,
          `Saved to Drafts, but it couldn't be sent: ${err instanceof ApiError ? err.detail : "network error"}`
        )
      }
      return inFuture ? "scheduled" : "sent"
    },
    onSuccess: (outcome) => {
      void queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
      void queryClient.invalidateQueries({ queryKey: ["calendar"] })
      void queryClient.invalidateQueries({ queryKey: ["billing"] })
      onSaved(outcome)
    },
    onError: (err) => {
      void queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
      setSaveError(err instanceof ApiError ? err : new ApiError(0, "Could not save the post."))
    },
  })

  const hasContent = text.trim().length > 0 || media.length > 0
  const canSave = !!kind && hasContent && !blocking && uploading === 0 && !save.isPending && mediaReady
  const canDispatch = canSave && !validating && selectedChannels.length > 0
  const dirty =
    !save.isSuccess &&
    (text !== (post?.base_text ?? "") ||
      media.length > (post?.base_media?.length ?? 0) ||
      threadParts.join("\n") !== extras.parts.join("\n") ||
      firstComment !== extras.firstComment)

  return {
    editing,
    channels,
    connectorBySlug,
    kind,
    setKind,
    text,
    setText,
    link,
    setLink,
    scheduled,
    setScheduled,
    selected,
    toggleChannel: (id: number) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    media,
    setMedia,
    overrides,
    setOverrides,
    threadParts,
    setThreadParts,
    firstComment,
    setFirstComment,
    eligible,
    selectedChannels,
    supportsLink,
    threadChannels,
    threadMax,
    commentChannels,
    findings,
    validating,
    upload,
    uploading,
    mediaLoadFailed,
    reviewFirst,
    inFuture,
    save,
    saveError,
    canSave,
    canDispatch,
    dirty,
  }
}
