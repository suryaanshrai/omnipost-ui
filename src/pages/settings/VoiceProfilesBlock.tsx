import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { OutlineButton, PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import ConfirmDialog from "@/components/editorial/ConfirmDialog"
import Field, { TextareaField } from "@/components/editorial/Field"
import { apiFetch, ApiError } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import type { VoiceProfile } from "@/types/api"
import { useWorkspaceList, errorText } from "./shared"

export function VoiceProfilesBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const profiles = useWorkspaceList<VoiceProfile>("voice-profiles")
  const [editing, setEditing] = useState<VoiceProfile | "new" | null>(null)
  const [removing, setRemoving] = useState<VoiceProfile | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["voice-profiles", activeWorkspace.id] })

  const remove = useMutation({
    mutationFn: (p: VoiceProfile) => apiFetch(`/voice-profiles/${p.id}/`, { method: "DELETE" }),
    onSuccess: () => {
      setRemoving(null)
      void invalidate()
    },
    onError: (err) => toast.error(errorText(err, "Could not delete the profile.")),
  })

  return (
    <Block title="Voice profiles" aside="Used by AI drafting">
      {(profiles.data ?? []).length === 0 && (
        <p className="text-[14px] text-ink-55">
          None yet. A voice profile describes how you write, so AI drafts sound like you.
        </p>
      )}
      <ul className="-mt-6 empty:mt-0">
        {(profiles.data ?? []).map((p) =>
          editing !== null && editing !== "new" && editing.id === p.id ? (
            <li key={p.id} className="border-b border-hair py-5">
              <VoiceProfileForm profile={p} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={p.id} className="flex items-start gap-4 border-b border-hair py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">
                  {p.name} {p.is_default && <span className="eyebrow ml-2 text-rust">Default</span>}
                </span>
                {p.style_summary && <span className="mt-1 block text-[13px] leading-[1.55] text-ink-55">{p.style_summary}</span>}
              </span>
              <TextButton type="button" tone="muted" onClick={() => setEditing(p)}>
                Edit
              </TextButton>
              <TextButton type="button" tone="muted" onClick={() => setRemoving(p)}>
                Delete
              </TextButton>
            </li>
          )
        )}
      </ul>
      {editing === "new" ? (
        <div className="mt-6">
          <VoiceProfileForm onDone={() => setEditing(null)} />
        </div>
      ) : (
        <OutlineButton type="button" className="mt-6" onClick={() => setEditing("new")}>
          Add voice profile
        </OutlineButton>
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Delete ${removing?.name ?? "profile"}?`}
        confirmLabel="Delete"
        tone="rust"
        onConfirm={() => removing && remove.mutate(removing)}
        pending={remove.isPending}
      />
    </Block>
  )
}

export function VoiceProfileForm({ profile, onDone }: { profile?: VoiceProfile; onDone: () => void }) {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile?.name ?? "")
  const [summary, setSummary] = useState(profile?.style_summary ?? "")
  const [examples, setExamples] = useState(
    Array.isArray(profile?.example_posts) ? (profile.example_posts as string[]).join("\n\n") : ""
  )
  const [isDefault, setIsDefault] = useState(!!profile?.is_default)
  const [error, setError] = useState<ApiError | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const body = {
        workspace: activeWorkspace.id,
        name: name.trim(),
        style_summary: summary.trim(),
        example_posts: examples
          .split(/\n\s*\n/)
          .map((s) => s.trim())
          .filter(Boolean),
        is_default: isDefault,
      }
      return profile
        ? apiFetch<VoiceProfile>(`/voice-profiles/${profile.id}/`, { method: "PATCH", body })
        : apiFetch<VoiceProfile>("/voice-profiles/", { method: "POST", body })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voice-profiles", activeWorkspace.id] })
      toast(profile ? "Voice profile saved" : "Voice profile added")
      onDone()
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not save.")),
  })

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        save.mutate()
      }}
      className="flex flex-col gap-6"
    >
      <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} errors={error?.fieldErrors.name} autoFocus />
      <TextareaField
        label="How you write"
        rows={3}
        placeholder="Dry, specific, no exclamation marks. Short sentences."
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        errors={error?.fieldErrors.style_summary}
      />
      <TextareaField
        label="Example posts"
        rows={5}
        hint="Paste a few real posts, separated by a blank line."
        value={examples}
        onChange={(e) => setExamples(e.target.value)}
        errors={error?.fieldErrors.example_posts}
      />
      <label className="flex items-center gap-3 text-[14px]">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-[var(--rust)]" />
        Use by default
      </label>
      {error && !Object.keys(error.fieldErrors).length && <p className="text-[13px] text-rust">{error.detail}</p>}
      <div className="flex items-center gap-6">
        <PrimaryButton type="submit" disabled={!name.trim() || save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </PrimaryButton>
        <TextButton type="button" tone="muted" onClick={onDone}>
          Cancel
        </TextButton>
      </div>
    </form>
  )
}
