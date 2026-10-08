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

  // Editing: hydrate the attached assets (Post.base_media is ids only).
  useEffect(() => {
    if (!post?.base_media?.length) return
    let cancelled = false
    Promise.all(post.base_media.map((id) => apiFetch<MediaAsset>(`/media/${id}/`)))
      .then((assets) => !cancelled && setMedia(assets))
      .catch(() => {})
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
  const maxLength = selectedChannels.reduce<number | null>((min, c) => {
    const max = connectorBySlug.get(c.connector_slug)?.max_text_length ?? null
    return max == null ? min : min == null ? max : Math.min(min, max)
  }, null)

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
  const validating = findings.some((f) => f.isFetching)

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

  const save = useMutation({
    mutationFn: () => {
      const scheduledFor = fromLocalInput(scheduled)
      const body: Record<string, unknown> = {
        kind,
        base_text: text,
        base_media: media.map((m) => m.id),
        scheduled_for: scheduledFor,
      }
      if (link || editing) body.link = supportsLink ? link : ""
      if (editing) {
        body.target_specs = targetSpecsFor(post!, selected.filter((id) => eligible.some((c) => c.id === id)), overrides)
        return apiFetch<Post>(`/posts/${post!.id}/`, { method: "PATCH", body })
      }
      body.workspace = activeWorkspace.id
      body.target_specs = selectedChannels.map((c) => (overrides[c.id] ? { channel: c.id, text_override: overrides[c.id] } : { channel: c.id }))
      return apiFetch<Post>("/posts/", { method: "POST", body })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
      queryClient.invalidateQueries({ queryKey: ["calendar"] })
      toast(editing ? "Draft updated" : "Saved to Drafts")
      onOpenChange(false)
      if (!editing) navigate("/app/drafts")
    },
    onError: (err) => setSaveError(err instanceof ApiError ? err : new ApiError(0, "Could not save the draft.")),
  })

  const isMediaKind = kind && kind !== "text"
  const hasContent = text.trim().length > 0 || media.length > 0
  const canSave = !!kind && hasContent && !blocking && uploading === 0 && !save.isPending

  const step = kind ? 2 : 1

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !save.isPending && onOpenChange(o)}
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
              <PrimaryButton type="button" onClick={() => save.mutate()} disabled={!canSave}>
                {save.isPending ? "Saving…" : editing ? "Save changes" : "Save draft"}
              </PrimaryButton>
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
            {maxLength != null && (
              <div className={cn("eyebrow mt-2 text-right", text.length > maxLength && "text-rust")}>
                {text.length} / {maxLength}
              </div>
            )}
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
            label="Schedule (optional)"
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
            hint="Leave empty to dispatch whenever you choose from Drafts."
            errors={saveError?.fieldErrors.scheduled_for}
          />

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
