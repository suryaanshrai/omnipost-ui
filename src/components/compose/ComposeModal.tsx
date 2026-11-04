import { useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent, ReactNode } from "react"
import { Link, useNavigate } from "react-router"
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChannelToggle } from "@/components/app/ChannelChip"
import { PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import Field, { TextareaField } from "@/components/editorial/Field"
import HoverRow from "@/components/editorial/HoverRow"
import Modal from "@/components/editorial/Modal"
import { apiFetch, ApiError } from "@/lib/api"
import { fromLocalInput, toLocalInput } from "@/lib/format"
import { mediaUrl } from "@/lib/media"
import { targetSpecsFor } from "@/lib/posts"
import { useChannels, useConnectors } from "@/lib/queries"
import { useDebounced } from "@/lib/use-debounced"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Channel, MediaAsset, Post, PostKind, ValidateResult } from "@/types/api"
import { kindLabel, POST_KINDS } from "./compose-context"
import AiPanel from "./AiPanel"

const ACCEPT: Record<PostKind, string> = {
  text: "",
  image: "image/*",
  video: "video/*",
  short_video: "video/*",
  story: "image/*,video/*",
}

function assetKind(file: File): "image" | "video" | "gif" {
  if (file.type.startsWith("video/")) return "video"
  if (file.type === "image/gif") return "gif"
  return "image"
}

export default function ComposeModal({
  open,
  onOpenChange,
  initialKind,
  post,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialKind?: PostKind
  post?: Post
}) {
  const { activeWorkspace } = useWorkspace()
  const channels = useChannels()
  const connectors = useConnectors()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const editing = !!post

  const [kind, setKind] = useState<PostKind | undefined>(post?.kind ?? initialKind)
  const [text, setText] = useState(post?.base_text ?? "")
  const [link, setLink] = useState(post?.link ?? "")
  const [scheduled, setScheduled] = useState(toLocalInput(post?.scheduled_for))
  const [selected, setSelected] = useState<number[]>(() => post?.targets.map((t) => t.channel) ?? [])
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [overrides, setOverrides] = useState<Record<number, string>>(() =>
    Object.fromEntries((post?.targets ?? []).filter((t) => t.text_override).map((t) => [t.channel, t.text_override!]))
  )
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

  const connectorBySlug = useMemo(() => new Map((connectors.data ?? []).map((c) => [c.slug, c])), [connectors.data])
  const eligible = (channels.data ?? []).filter((c) =>
    kind ? connectorBySlug.get(c.connector_slug)?.post_kinds.includes(kind) : false
  )
  const selectedChannels = eligible.filter((c) => selected.includes(c.id))
  const supportsLink = selectedChannels.some((c) => connectorBySlug.get(c.connector_slug)?.supports_link)

  // Live per-channel findings, debounced so typing doesn't fire a request per keystroke.
  const validateInput = useDebounced(
    { text, link: supportsLink ? link : "", media: media.map((m) => m.id), kind, overrides },
    500
  )
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
  const blocking = findings.some((f) => f.data?.findings.some((x) => x.blocking))
  // Still typing, or a check is in flight: the findings may be stale.
  const checksSettled =
    JSON.stringify(validateInput) ===
    JSON.stringify({ text, link: supportsLink ? link : "", media: media.map((m) => m.id), kind, overrides })
  const validating = !checksSettled || findings.some((f) => f.isFetching)

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

  const reviewFirst = !!activeWorkspace.approval_workflow_enabled
  const scheduledFor = fromLocalInput(scheduled)
  const inFuture = !!scheduledFor && new Date(scheduledFor).getTime() > Date.now()

  const save = useMutation({
    mutationFn: async (then: "draft" | "dispatch") => {
      const body: Record<string, unknown> = {
        kind,
        base_text: text,
        scheduled_for: scheduledFor,
      }
      // Never send a media list we haven't loaded: that would detach it.
      if (mediaReady) body.base_media = media.map((m) => m.id)
      if (link || editing) body.link = supportsLink ? link : ""
      let saved: Post
      if (editing) {
        body.target_specs = targetSpecsFor(post!, selected.filter((id) => eligible.some((c) => c.id === id)), overrides)
        saved = await apiFetch<Post>(`/posts/${post!.id}/`, { method: "PATCH", body })
      } else {
        body.workspace = activeWorkspace.id
        body.target_specs = selectedChannels.map((c) =>
          overrides[c.id] ? { channel: c.id, text_override: overrides[c.id] } : { channel: c.id }
        )
        saved = await apiFetch<Post>("/posts/", { method: "POST", body })
      }
      if (then === "draft") return { saved, outcome: "draft" as const }
      if (reviewFirst) {
        await apiFetch(`/posts/${saved.id}/submit-for-review/`, { method: "POST" })
        return { saved, outcome: "review" as const }
      }
      try {
        await apiFetch(`/posts/${saved.id}/schedule/`, {
          method: "POST",
          body: inFuture ? { run_at: scheduledFor } : {},
        })
      } catch (err) {
        // The draft is saved; only the dispatch failed. Say so instead of
        // leaving the user unsure whether anything was kept.
        throw new ApiError(
          err instanceof ApiError ? err.status : 0,
          `Saved to Drafts, but it couldn't be sent: ${err instanceof ApiError ? err.detail : "network error"}`
        )
      }
      return { saved, outcome: inFuture ? ("scheduled" as const) : ("sent" as const) }
    },
    onSuccess: ({ outcome }) => {
      queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
      queryClient.invalidateQueries({ queryKey: ["calendar"] })
      onOpenChange(false)
      if (outcome === "draft") {
        toast(editing ? "Draft updated" : "Saved to Drafts")
        if (!editing) navigate("/app/drafts")
      } else if (outcome === "review") {
        toast("Sent for review")
        navigate("/app/approvals")
      } else if (outcome === "scheduled") {
        toast("Scheduled")
        navigate("/app/calendar")
      } else {
        toast("Publishing now. Delivery reports appear in Posts.")
        navigate("/app")
      }
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
      setSaveError(err instanceof ApiError ? err : new ApiError(0, "Could not save the post."))
    },
  })

  const isMediaKind = kind && kind !== "text"
  const hasContent = text.trim().length > 0 || media.length > 0
  const canSave = !!kind && hasContent && !blocking && uploading === 0 && !save.isPending && mediaReady
  const canDispatch = canSave && !validating && selectedChannels.length > 0
  const dispatchLabel = reviewFirst ? "Submit for review" : inFuture ? "Schedule" : "Publish now"
  const dirty = !save.isSuccess && (text !== (post?.base_text ?? "") || media.length > (post?.base_media?.length ?? 0))

  const step = kind ? 2 : 1

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (save.isPending) return
        // Escape or a click outside used to throw away a half-written post.
        if (!o && dirty && !window.confirm("Discard this post? What you've written won't be saved.")) return
        onOpenChange(o)
      }}
      eyebrow={step === 1 ? "Step one · Format" : `Step two · ${kindLabel(kind)}`}
      title={step === 1 ? "What are you posting?" : editing ? "Edit the draft" : "Write it once"}
      footer={
        <>
          <div>
            {step === 2 && (
              <TextButton type="button" tone="muted" onClick={() => setKind(undefined)} disabled={save.isPending}>
                ← Back
              </TextButton>
            )}
          </div>
          <div className="flex items-center gap-6">
            <TextButton type="button" tone="muted" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </TextButton>
            {step === 2 && (
              <>
                <TextButton type="button" onClick={() => save.mutate("draft")} disabled={!canSave}>
                  {editing ? "Save changes" : "Save draft"}
                </TextButton>
                <PrimaryButton
                  type="button"
                  onClick={() => save.mutate("dispatch")}
                  disabled={!canDispatch}
                  title={selectedChannels.length ? undefined : "Choose at least one channel"}
                >
                  {save.isPending ? "Working…" : dispatchLabel}
                </PrimaryButton>
              </>
            )}
          </div>
        </>
      }
    >
      {step === 1 ? (
        <div className="-mx-2 border-t border-hair">
          {POST_KINDS.map((k, i) => (
            <HoverRow
              key={k.kind}
              as="button"
              type="button"
              onClick={() => setKind(k.kind)}
              className="grid w-full grid-cols-[44px_1fr_24px] items-center px-2 py-4 text-left"
            >
              <HoverRow.Num className="text-[20px]">0{i + 1}</HoverRow.Num>
              <HoverRow.Title className="text-[13px] font-bold tracking-[0.14em] uppercase">{k.label}</HoverRow.Title>
              <HoverRow.Arrow />
            </HoverRow>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {isMediaKind && (
            <Dropzone
              accept={ACCEPT[kind!]}
              multiple={kind === "image"}
              onFiles={upload}
              uploading={uploading > 0}
            >
              {media.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {media.map((m) => (
                    <div key={m.id} className="group relative h-20 w-20 overflow-hidden border border-hair">
                      {m.kind === "video" ? (
                        <video src={mediaUrl(m.file)} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={mediaUrl(m.file)} alt={m.alt_text || ""} className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        aria-label="Remove"
                        onClick={() => setMedia((prev) => prev.filter((x) => x.id !== m.id))}
                        className="absolute top-0 right-0 bg-ink px-1.5 text-[12px] text-page"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Dropzone>
          )}

          <div>
            <TextareaField
              rows={kind === "text" ? 6 : 3}
              label={isMediaKind ? "Caption" : "Post"}
              placeholder={isMediaKind ? "Say something about it…" : "Write the thought once…"}
              value={text}
              autoFocus={kind === "text"}
              onChange={(e) => setText(e.target.value)}
              errors={saveError?.fieldErrors.base_text}
            />
            <CharCounts channels={selectedChannels} text={text} overrides={overrides} connectors={connectorBySlug} />
          </div>

          <AiPanel
            text={text}
            channels={selectedChannels}
            overrides={overrides}
            onOverrides={setOverrides}
            onText={setText}
            media={media}
            onMedia={setMedia}
            kind={kind!}
          />

          {supportsLink && (
            <Field
              label="Link (optional)"
              type="url"
              placeholder="https://"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              errors={saveError?.fieldErrors.link}
            />
          )}

          <div>
            <div className="eyebrow mb-3">Publish to</div>
            {channels.isLoading ? (
              <p className="text-[13px] text-ink-45">Loading channels…</p>
            ) : eligible.length ? (
              <div className="flex flex-wrap gap-2">
                {eligible.map((c) => (
                  <ChannelToggle
                    key={c.id}
                    channel={c}
                    selected={selected.includes(c.id)}
                    onToggle={() =>
                      setSelected((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-ink-55">
                No connected channel takes {kindLabel(kind).toLowerCase()} posts.{" "}
                <Link
                  to="/app/connections"
                  onClick={() => onOpenChange(false)}
                  className="text-ink underline underline-offset-4 hover:text-rust"
                >
                  Connect one
                </Link>
                , or save the draft and choose later.
              </p>
            )}
          </div>

          <Field
            label="Send at (optional)"
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
            hint={
              reviewFirst
                ? "Approval is on: the post goes to review first."
                : inFuture
                  ? "It goes out at this time, in your browser's time zone."
                  : "Leave empty to publish now, or pick a time."
            }
            errors={saveError?.fieldErrors.scheduled_for}
          />

          {mediaLoadFailed && (
            <p role="alert" className="text-[13px] text-rust">
              This draft's media didn't load, so saving is off to keep it attached. Close and try again.
            </p>
          )}

          <Findings channels={selectedChannels} results={findings.map((f) => f.data)} validating={validating} />

          {saveError && !Object.keys(saveError.fieldErrors).some((k) => ["base_text", "link", "scheduled_for"].includes(k)) && (
            <p role="alert" className="text-[13px] text-rust">
              {saveError.detail}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

/** Characters used against each selected network's limit (its own text when it has an override). */
function CharCounts({
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

function Findings({
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

function Dropzone({
  accept,
  multiple,
  onFiles,
  uploading,
  children,
}: {
  accept: string
  multiple: boolean
  onFiles: (files: FileList) => void
  uploading: boolean
  children?: ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files)
  }
  return (
    <div className="flex flex-col gap-3">
      <span className="eyebrow">Media</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex h-28 w-full flex-col items-center justify-center gap-1.5 border border-dashed text-center transition-colors",
          over ? "border-rust bg-rust/[.05]" : "border-hair hover:border-ink"
        )}
      >
        <span className="text-[13px] text-ink">{uploading ? "Uploading…" : "Drop a file, or click to choose"}</span>
        <span className="eyebrow">{accept.replace(/\/\*/g, "").replace(",", " or ")}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
          e.target.value = ""
        }}
      />
      {children}
    </div>
  )
}
