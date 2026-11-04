import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import Field from "@/components/editorial/Field"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import type { Workspace } from "@/types/api"

type BioLink = { label: string; url: string }

function asLinks(raw: unknown): BioLink[] {
  return Array.isArray(raw)
    ? raw.map((l) => ({ label: String(l?.label ?? ""), url: String(l?.url ?? "") }))
    : []
}

/** A public link-in-bio page: your links plus your latest posts. */
export default function BioBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(!!activeWorkspace.bio_enabled)
  const [description, setDescription] = useState(activeWorkspace.bio_description ?? "")
  const [links, setLinks] = useState<BioLink[]>(asLinks(activeWorkspace.bio_links))
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    setEnabled(!!activeWorkspace.bio_enabled)
    setDescription(activeWorkspace.bio_description ?? "")
    setLinks(asLinks(activeWorkspace.bio_links))
  }, [activeWorkspace])

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Workspace>(`/workspaces/${activeWorkspace.id}/`, {
        method: "PATCH",
        body: {
          bio_enabled: enabled,
          bio_description: description.trim(),
          bio_links: links.filter((l) => l.label.trim() || l.url.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
        },
      }),
    onSuccess: (updated) => {
      setError(null)
      queryClient.setQueryData<Page<Workspace>>(["workspaces"], (prev) =>
        prev ? { ...prev, results: prev.results.map((w) => (w.id === updated.id ? updated : w)) } : prev
      )
      toast("Bio page saved")
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not save.")),
  })

  const url = `${window.location.origin}/bio/${activeWorkspace.slug}`
  const setLink = (i: number, patch: Partial<BioLink>) =>
    setLinks((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  return (
    <Block title="Link in bio" aside={enabled ? <a href={url} target="_blank" rel="noreferrer" className="underline">Open page</a> : "Off"}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
        className="flex flex-col gap-6"
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--rust)]" />
          <span>
            <span className="block text-[14px] font-semibold text-ink">Public page</span>
            <span className="block text-[13px] leading-[1.55] break-all text-ink-55">
              {url}: your links and your latest published posts. Anyone with the address can see it.
            </span>
          </span>
        </label>
        <Field label="About" value={description} onChange={(e) => setDescription(e.target.value)} errors={error?.fieldErrors.bio_description} />
        <fieldset className="flex flex-col gap-4">
          <legend className="eyebrow mb-1">Links</legend>
          {links.map((l, i) => (
            <div key={i} className="grid items-end gap-4 sm:grid-cols-[1fr_2fr_auto]">
              <Field label="Label" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
              <Field label="URL" type="url" placeholder="https://" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
              <TextButton type="button" tone="muted" onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}>
                Remove
              </TextButton>
            </div>
          ))}
          {links.length < 20 && (
            <TextButton type="button" className="self-start" onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}>
              Add a link
            </TextButton>
          )}
          {error?.fieldErrors.bio_links && <p className="text-[13px] text-rust">{error.fieldErrors.bio_links.join(" ")}</p>}
        </fieldset>
        <PrimaryButton type="submit" className="self-start" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </PrimaryButton>
        {error && !Object.keys(error.fieldErrors).length && <p className="text-[13px] text-rust">{error.detail}</p>}
      </form>
    </Block>
  )
}
