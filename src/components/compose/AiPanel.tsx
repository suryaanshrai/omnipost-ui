import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { OutlineButton, TextButton } from "@/components/editorial/Buttons"
import Field, { SelectField, TextareaField } from "@/components/editorial/Field"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { mediaUrl } from "@/lib/media"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type {
  AIUsage,
  AltTextResult,
  AspectRatio,
  Channel,
  GenerateVariantsResult,
  MediaAsset,
  PostKind,
  RepurposeResult,
  ValidateFinding,
  VoiceProfile,
} from "@/types/api"

export interface AiPanelProps {
  text: string
  onText: (text: string) => void
  channels: Channel[]
  overrides: Record<number, string>
  onOverrides: Dispatch<SetStateAction<Record<number, string>>>
  media: MediaAsset[]
  onMedia: Dispatch<SetStateAction<MediaAsset[]>>
  kind: PostKind
}

type Tab = "variants" | "repurpose" | "image" | "alt"

const ASPECTS: { value: AspectRatio; label: string }[] = [
  { value: "square_1x1", label: "Square 1:1" },
  { value: "portrait_4x5", label: "Portrait 4:5" },
  { value: "vertical_9x16", label: "Vertical 9:16" },
  { value: "landscape_16x9", label: "Landscape 16:9" },
]

/** AI errors come back as 400 {detail} (quota / not configured) or 502 — shown verbatim. */
function aiError(err: unknown): string {
  return err instanceof ApiError ? err.detail : "The AI request didn't go through."
}

function quotaLabel(c: { committed: number; reserved: number; limit: number | null } | undefined, noun: string) {
  if (!c) return null
  const used = c.committed + c.reserved
  return c.limit == null ? `${used} ${noun} · unlimited` : `${used} / ${c.limit} ${noun}`
}

/**
 * "Draft with AI", inside compose step two. Per-channel variants land in
 * each target's text_override (editable below, and preserved across a
 * draft's channel toggles); repurpose rewrites existing text or a URL;
 * image generation and alt text add to / annotate the attached media.
 */
export default function AiPanel({ text, onText, channels, overrides, onOverrides, media, onMedia, kind }: AiPanelProps) {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("variants")
  const [brief, setBrief] = useState("")
  const [voice, setVoice] = useState("")
  const [source, setSource] = useState("")
  const [repurposed, setRepurposed] = useState<Record<string, string> | null>(null)
  const [prompt, setPrompt] = useState("")
  const [aspect, setAspect] = useState<AspectRatio>("square_1x1")
  const [variantFindings, setVariantFindings] = useState<Record<number, ValidateFinding[]>>({})
  const [error, setError] = useState<string | null>(null)

  const usage = useQuery({
    queryKey: ["ai-usage", activeWorkspace.id],
    queryFn: () => apiFetch<AIUsage>(`/ai/usage/?workspace=${activeWorkspace.id}`),
    enabled: open,
  })
  const voices = useQuery({
    queryKey: ["voice-profiles", activeWorkspace.id],
    queryFn: () => apiFetch<Page<VoiceProfile>>(`/voice-profiles/?workspace=${activeWorkspace.id}&limit=200`),
    select: (page) => page.results,
    enabled: open,
  })
  const refreshUsage = () => queryClient.invalidateQueries({ queryKey: ["ai-usage", activeWorkspace.id] })
  const voiceId = voice ? Number(voice) : (voices.data?.find((v) => v.is_default)?.id ?? null)

  const variants = useMutation({
    mutationFn: () =>
      apiFetch<GenerateVariantsResult>("/ai/variants/", {
        method: "POST",
        body: {
          workspace: activeWorkspace.id,
          brief: brief.trim() || text.trim(),
          channels: channels.map((c) => c.id),
          voice_profile: voiceId,
        },
      }),
    onSuccess: (r) => {
      setError(null)
      onOverrides((prev) => ({ ...prev, ...Object.fromEntries(r.variants.map((v) => [v.channel, v.text])) }))
      setVariantFindings(Object.fromEntries(r.variants.map((v) => [v.channel, v.findings])))
      refreshUsage()
    },
    onError: (err) => setError(aiError(err)),
  })

  const formats = [...new Set(channels.map((c) => c.connector_slug))]
  const repurpose = useMutation({
    mutationFn: () => {
      const isUrl = /^https?:\/\//i.test(source.trim())
      return apiFetch<RepurposeResult>("/ai/repurpose/", {
        method: "POST",
        body: {
          workspace: activeWorkspace.id,
          source_text: isUrl ? "" : source.trim() || text.trim(),
          source_url: isUrl ? source.trim() : "",
          target_formats: formats.length ? formats : ["social_post"],
          voice_profile: voiceId,
        },
      })
    },
    onSuccess: (r) => {
      setError(null)
      setRepurposed(r.results)
      refreshUsage()
    },
    onError: (err) => setError(aiError(err)),
  })

  const image = useMutation({
    mutationFn: () =>
      apiFetch<MediaAsset>("/ai/images/", {
        method: "POST",
        body: { workspace: activeWorkspace.id, prompt: prompt.trim(), aspect },
      }),
    onSuccess: (asset) => {
      setError(null)
      onMedia((prev) => [...prev, asset])
      refreshUsage()
    },
    onError: (err) => setError(aiError(err)),
  })

  const altText = useMutation({
    mutationFn: (asset: MediaAsset) =>
      apiFetch<AltTextResult>("/ai/alt-text/", { method: "POST", body: { media: asset.id } }).then((r) => ({ asset, r })),
    onSuccess: ({ asset, r }) => {
      setError(null)
      onMedia((prev) => prev.map((m) => (m.id === asset.id ? { ...m, alt_text: r.alt_text } : m)))
      refreshUsage()
    },
    onError: (err) => setError(aiError(err)),
  })

  const imageKinds: PostKind[] = ["image", "story"]
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "variants", label: "Per-channel", show: true },
    { id: "repurpose", label: "Repurpose", show: true },
    { id: "image", label: "Image", show: imageKinds.includes(kind) },
    { id: "alt", label: "Alt text", show: media.some((m) => m.kind === "image") },
  ]
  const pending = variants.isPending || repurpose.isPending || image.isPending || altText.isPending
  const overrideChannels = channels.filter((c) => overrides[c.id] != null)

  return (
    <div className="border border-hair">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="eyebrow text-ink">✳ Draft with AI</span>
        <span className="eyebrow">
          {open ? quotaLabel(usage.data?.ai_text_generation, "this month") ?? "—" : overrideChannels.length ? `${overrideChannels.length} per-channel` : "Open"}
        </span>
      </button>

      {open && (
        <div className="border-t border-hair px-4 pt-4 pb-5">
          <div role="tablist" className="flex gap-6 border-b border-hair">
            {tabs
              .filter((t) => t.show)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => {
                    setTab(t.id)
                    setError(null)
                  }}
                  className={cn(
                    "-mb-px border-b pb-2.5 text-[10px] font-bold tracking-[0.16em] uppercase",
                    tab === t.id ? "border-rust text-ink" : "border-transparent text-ink-45 hover:text-ink"
                  )}
                >
                  {t.label}
                </button>
              ))}
          </div>

          <div className="mt-5 flex flex-col gap-5">
            {(tab === "variants" || tab === "repurpose") && (voices.data?.length ?? 0) > 0 && (
              <SelectField label="Voice" value={voice || String(voiceId ?? "")} onChange={(e) => setVoice(e.target.value)}>
                <option value="">No voice profile</option>
                {voices.data!.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </SelectField>
            )}

            {tab === "variants" && (
              <>
                <TextareaField
                  label="Brief"
                  rows={2}
                  placeholder={text ? "Leave empty to work from the post above" : "What's the post about?"}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                />
                <div>
                  <OutlineButton
                    type="button"
                    onClick={() => variants.mutate()}
                    disabled={pending || channels.length === 0 || !(brief.trim() || text.trim())}
                  >
                    {variants.isPending ? "Writing…" : "Write a version per channel"}
                  </OutlineButton>
                  {channels.length === 0 && <p className="mt-2 text-[12px] text-ink-45">Pick channels below first.</p>}
                </div>
              </>
            )}

            {tab === "repurpose" && (
              <>
                <TextareaField
                  label="Source"
                  rows={3}
                  placeholder="Paste text or a URL — leave empty to rework the post above"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
                <OutlineButton
                  type="button"
                  className="self-start"
                  onClick={() => repurpose.mutate()}
                  disabled={pending || !(source.trim() || text.trim())}
                >
                  {repurpose.isPending ? "Reworking…" : "Repurpose"}
                </OutlineButton>
                {repurposed && (
                  <ul className="flex flex-col gap-4">
                    {Object.entries(repurposed).map(([fmt, out]) => {
                      const targets = channels.filter((c) => c.connector_slug === fmt)
                      return (
                        <li key={fmt} className="border-l border-hair pl-4">
                          <span className="eyebrow">{fmt.replace(/_/g, " ")}</span>
                          <p className="mt-1 text-[13.5px] leading-[1.6] whitespace-pre-line">{out || "—"}</p>
                          {out && (
                            <div className="mt-2 flex gap-5">
                              <TextButton type="button" onClick={() => onText(out)}>
                                Use as the post
                              </TextButton>
                              {targets.length > 0 && (
                                <TextButton
                                  type="button"
                                  tone="muted"
                                  onClick={() =>
                                    onOverrides((prev) => ({ ...prev, ...Object.fromEntries(targets.map((c) => [c.id, out])) }))
                                  }
                                >
                                  Use for {targets.map((c) => c.display_name).join(", ")}
                                </TextButton>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}

            {tab === "image" && (
              <>
                <Field label="Describe the image" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                <SelectField label="Shape" value={aspect} onChange={(e) => setAspect(e.target.value as AspectRatio)}>
                  {ASPECTS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </SelectField>
                <div className="flex items-center gap-4">
                  <OutlineButton type="button" onClick={() => image.mutate()} disabled={pending || !prompt.trim()}>
                    {image.isPending ? "Generating…" : "Generate image"}
                  </OutlineButton>
                  <span className="eyebrow">{quotaLabel(usage.data?.ai_image_generation, "images")}</span>
                </div>
              </>
            )}

            {tab === "alt" && (
              <ul className="flex flex-col gap-4">
                {media
                  .filter((m) => m.kind === "image")
                  .map((m) => (
                    <li key={m.id} className="grid grid-cols-[56px_1fr] gap-3">
                      <img src={mediaUrl(m.file)} alt="" className="h-14 w-14 border border-hair object-cover" />
                      <div>
                        <p className="text-[13px] leading-[1.5] text-ink-55">{m.alt_text || "No alt text yet."}</p>
                        <TextButton type="button" className="mt-1.5" onClick={() => altText.mutate(m)} disabled={pending}>
                          {altText.isPending && altText.variables?.id === m.id ? "Describing…" : m.alt_text ? "Rewrite" : "Write alt text"}
                        </TextButton>
                      </div>
                    </li>
                  ))}
              </ul>
            )}

            {error && (
              <p role="alert" className="text-[13px] leading-[1.5] text-rust">
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      {overrideChannels.length > 0 && (
        <div className="border-t border-hair px-4 pt-4 pb-5">
          <div className="eyebrow mb-4">Per-channel versions</div>
          <div className="flex flex-col gap-5">
            {overrideChannels.map((c) => (
              <div key={c.id}>
                <TextareaField
                  label={c.display_name}
                  rows={3}
                  value={overrides[c.id]}
                  onChange={(e) => onOverrides((prev) => ({ ...prev, [c.id]: e.target.value }))}
                />
                {(variantFindings[c.id] ?? []).map((f, i) => (
                  <p key={i} className={cn("mt-1 text-[12px]", f.blocking ? "text-rust" : "text-ink-55")}>
                    {f.blocking ? "✕ " : "· "}
                    {f.message}
                  </p>
                ))}
                <TextButton
                  type="button"
                  tone="muted"
                  className="mt-2"
                  onClick={() =>
                    onOverrides((prev) => {
                      const next = { ...prev }
                      delete next[c.id]
                      return next
                    })
                  }
                >
                  Use the main post instead
                </TextButton>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
