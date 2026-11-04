import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, type Page } from "@/lib/api"
import { mediaUrl } from "@/lib/media"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { MediaAsset } from "@/types/api"

/** Pick something already uploaded to this workspace instead of uploading again. */
export function MediaLibrary({
  kinds,
  chosen,
  onPick,
}: {
  kinds: string[]
  chosen: number[]
  onPick: (asset: MediaAsset) => void
}) {
  const { activeWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const library = useQuery({
    queryKey: ["media", "library", activeWorkspace.id],
    queryFn: () => apiFetch<Page<MediaAsset>>(`/media/?workspace=${activeWorkspace.id}&limit=48`),
    enabled: open,
    select: (page) => page.results.filter((m) => kinds.includes(m.kind)),
  })
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start border-b border-hair text-[12px] text-ink-55 hover:text-ink">
        Or choose from your library
      </button>
    )
  }
  const items = library.data ?? []
  return (
    <div className="border border-hair p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow">Your library</span>
        <button type="button" onClick={() => setOpen(false)} className="eyebrow hover:text-ink">
          Close
        </button>
      </div>
      {library.isLoading ? (
        <p className="eyebrow">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-ink-55">Nothing uploaded yet.</p>
      ) : (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {items.map((m) => {
            const taken = chosen.includes(m.id)
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={taken}
                  onClick={() => onPick(m)}
                  aria-label={m.alt_text ? `Add: ${m.alt_text}` : `Add ${m.kind} ${m.id}`}
                  className={cn("block aspect-square w-full overflow-hidden border border-hair", taken ? "opacity-40" : "hover:border-ink")}
                >
                  {m.kind === "video" ? (
                    <video src={mediaUrl(m.file)} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={mediaUrl(m.file)} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Alt text for one image, saved to the asset when the field loses focus. */
export function AltTextField({ asset, onSaved }: { asset: MediaAsset; onSaved: (asset: MediaAsset) => void }) {
  const [value, setValue] = useState(asset.alt_text ?? "")
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle")
  const queryClient = useQueryClient()
  const save = async () => {
    if (value === (asset.alt_text ?? "")) return
    setState("saving")
    try {
      const updated = await apiFetch<MediaAsset>(`/media/${asset.id}/`, { method: "PATCH", body: { alt_text: value } })
      queryClient.setQueryData(["media", asset.id], updated)
      onSaved(updated)
      setState("saved")
    } catch {
      setState("failed")
    }
  }
  return (
    <label className="flex flex-col gap-1 text-[12px]">
      <span className="eyebrow">Alt text {state === "saved" ? "· saved" : state === "failed" ? "· not saved" : ""}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="Describe the image for people who can't see it"
        className="border-0 border-b border-hair bg-transparent py-1 text-[13px] text-ink placeholder:text-ink-55 focus:border-rust"
      />
    </label>
  )
}
