import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { OutlineButton, PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import ConfirmDialog from "@/components/editorial/ConfirmDialog"
import Field, { SelectField, TextareaField } from "@/components/editorial/Field"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { formatStamp, timezoneOptions } from "@/lib/format"
import { useConnectors } from "@/lib/queries"
import { useSectionEyebrow } from "@/lib/nav"
import { useWorkspace } from "@/lib/workspace"
import type { AIProvider, AppCredential, Membership, ProviderKey, VoiceProfile, Workspace } from "@/types/api"

export default function Settings() {
  const eyebrow = useSectionEyebrow("/app/settings", "Workspace")
  return (
    <div className="max-w-[760px]">
      <SectionHeader eyebrow={eyebrow} title="Settings" />
      <WorkspaceBlock />
      <MembersBlock />
      <VoiceProfilesBlock />
      <ProviderKeysBlock />
      <AppCredentialsBlock />
      <NewWorkspaceBlock />
    </div>
  )
}

/** A per-workspace list endpoint, keyed so a workspace switch never shows the previous one's rows. */
function useWorkspaceList<T>(resource: string) {
  const { activeWorkspace } = useWorkspace()
  return useQuery({
    queryKey: [resource, activeWorkspace.id],
    queryFn: () => apiFetch<Page<T>>(`/${resource}/?workspace=${activeWorkspace.id}&limit=200`),
    select: (page) => page.results,
  })
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.detail : fallback
}

function WorkspaceBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [name, setName] = useState(activeWorkspace.name)
  const [tz, setTz] = useState(activeWorkspace.timezone ?? "")
  const [approvals, setApprovals] = useState(!!activeWorkspace.approval_workflow_enabled)
  const [error, setError] = useState<ApiError | null>(null)
  const zones = useMemo(timezoneOptions, [])

  useEffect(() => {
    setName(activeWorkspace.name)
    setTz(activeWorkspace.timezone ?? "")
    setApprovals(!!activeWorkspace.approval_workflow_enabled)
  }, [activeWorkspace])

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Workspace>(`/workspaces/${activeWorkspace.id}/`, {
        method: "PATCH",
        body: { name: name.trim(), timezone: tz.trim(), approval_workflow_enabled: approvals },
      }),
    onSuccess: (updated) => {
      setError(null)
      queryClient.setQueryData<Page<Workspace>>(["workspaces"], (prev) =>
        prev ? { ...prev, results: prev.results.map((w) => (w.id === updated.id ? updated : w)) } : prev
      )
      queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
      toast("Workspace saved")
    },
    onError: (err) => setError(err instanceof ApiError ? err : null),
  })

  const dirty =
    name !== activeWorkspace.name ||
    tz !== (activeWorkspace.timezone ?? "") ||
    approvals !== !!activeWorkspace.approval_workflow_enabled

  return (
    <Block title="Workspace" aside={activeWorkspace.slug}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
        className="grid gap-7 sm:grid-cols-2"
      >
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} errors={error?.fieldErrors.name} />
        <Field
          label="Timezone"
          list="omni-ws-timezones"
          placeholder="UTC"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          errors={error?.fieldErrors.timezone}
          hint="The default for channels that don't set their own."
        />
        <datalist id="omni-ws-timezones">
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
          <input
            type="checkbox"
            checked={approvals}
            onChange={(e) => setApprovals(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--rust)]"
          />
          <span>
            <span className="block text-[14px] font-semibold text-ink">Require approval before dispatch</span>
            <span className="block text-[13px] leading-[1.55] text-ink-55">
              Drafts are submitted for review and only approved posts can be scheduled or queued. Adds an Approvals
              screen to the sidebar.
            </span>
          </span>
        </label>
        <div className="sm:col-span-2">
          <PrimaryButton type="submit" disabled={!dirty || save.isPending || !name.trim()}>
            {save.isPending ? "Saving…" : "Save"}
          </PrimaryButton>
          {error && !error.fieldErrors.name && !error.fieldErrors.timezone && (
            <p className="mt-3 text-[13px] text-rust">{error.detail}</p>
          )}
        </div>
      </form>
    </Block>
  )
}

function MembersBlock() {
  const members = useWorkspaceList<Membership>("memberships")
  return (
    <Block title="Members" aside={`${members.data?.length ?? 0}`}>
      <ul className="-mt-6">
        {(members.data ?? []).map((m) => (
          <li key={m.id} className="flex items-center gap-4 border-b border-hair py-3">
            <span
              aria-hidden="true"
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-rust text-[11px] font-bold text-page uppercase"
            >
              {m.user.username.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{m.user.username}</span>
              {m.user.email && <span className="block truncate text-[12.5px] text-ink-55">{m.user.email}</span>}
            </span>
            <span className="eyebrow">{(m.role ?? "member").replace("_", " ")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] text-ink-45">Roles are recorded but not yet enforced; every member can do everything.</p>
    </Block>
  )
}

function VoiceProfilesBlock() {
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
      invalidate()
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

function VoiceProfileForm({ profile, onDone }: { profile?: VoiceProfile; onDone: () => void }) {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile?.name ?? "")
  const [summary, setSummary] = useState(profile?.style_summary ?? "")
  const [examples, setExamples] = useState(
    Array.isArray(profile?.example_posts) ? (profile!.example_posts as string[]).join("\n\n") : ""
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
      queryClient.invalidateQueries({ queryKey: ["voice-profiles", activeWorkspace.id] })
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

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "openrouter", label: "OpenRouter" },
]

function ProviderKeysBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const keys = useWorkspaceList<ProviderKey>("provider-keys")
  const [provider, setProvider] = useState<AIProvider>("anthropic")
  const [label, setLabel] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [error, setError] = useState<ApiError | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", activeWorkspace.id] })

  const add = useMutation({
    mutationFn: () =>
      apiFetch<ProviderKey>("/provider-keys/", {
        method: "POST",
        body: { workspace: activeWorkspace.id, provider, label: label.trim(), api_key: apiKey.trim() },
      }),
    onSuccess: () => {
      setError(null)
      setApiKey("")
      setLabel("")
      invalidate()
      toast("Key validated and saved")
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not save the key.")),
  })
  const toggle = useMutation({
    mutationFn: (k: ProviderKey) => apiFetch(`/provider-keys/${k.id}/`, { method: "PATCH", body: { is_active: !k.is_active } }),
    onSuccess: invalidate,
    onError: (err) => toast.error(errorText(err, "Could not update the key.")),
  })
  const remove = useMutation({
    mutationFn: (k: ProviderKey) => apiFetch(`/provider-keys/${k.id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  return (
    <Block title="AI provider keys" aside="Bring your own">
      <p className="mb-5 max-w-[560px] text-[14px] leading-[1.6] text-ink-55">
        AI drafting runs on your own provider key when one is set. Each key is checked with a live request before it's
        saved, and it's never shown again.
      </p>
      <ul className="border-t border-hair empty:border-0">
        {(keys.data ?? []).map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hair py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">
                {PROVIDERS.find((p) => p.value === k.provider)?.label ?? k.provider}
                {k.label && <span className="font-normal text-ink-55"> · {k.label}</span>}
              </span>
              <span className="eyebrow mt-0.5 block">
                {k.is_active ? "Active" : "Paused"}
                {k.last_validated_at && ` · checked ${formatStamp(k.last_validated_at)}`}
              </span>
            </span>
            <TextButton type="button" tone="muted" onClick={() => toggle.mutate(k)}>
              {k.is_active ? "Pause" : "Resume"}
            </TextButton>
            <TextButton type="button" tone="muted" onClick={() => remove.mutate(k)}>
              Remove
            </TextButton>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add.mutate()
        }}
        className="mt-6 grid gap-6 sm:grid-cols-[160px_1fr]"
      >
        <SelectField label="Provider" value={provider} onChange={(e) => setProvider(e.target.value as AIProvider)}>
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </SelectField>
        <Field label="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Field
          className="sm:col-span-2"
          label="API key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          errors={error?.fieldErrors.api_key}
        />
        {error && !error.fieldErrors.api_key && <p className="text-[13px] text-rust sm:col-span-2">{error.detail}</p>}
        <div className="sm:col-span-2">
          <OutlineButton type="submit" disabled={!apiKey.trim() || add.isPending}>
            {add.isPending ? "Checking the key…" : "Add key"}
          </OutlineButton>
        </div>
      </form>
    </Block>
  )
}

function AppCredentialsBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const connectors = useConnectors()
  const creds = useWorkspaceList<AppCredential>("app-credentials")
  const ownApp = (connectors.data ?? []).filter((c) => c.requires_own_app)
  const [slug, setSlug] = useState("")
  const [clientId, setClientId] = useState("")
  const [secret, setSecret] = useState("")
  const [label, setLabel] = useState("")
  const [error, setError] = useState<ApiError | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["app-credentials", activeWorkspace.id] })
  const chosen = slug || ownApp[0]?.slug || ""

  const add = useMutation({
    mutationFn: () =>
      apiFetch<AppCredential>("/app-credentials/", {
        method: "POST",
        body: { workspace: activeWorkspace.id, connector_slug: chosen, client_id: clientId.trim(), client_secret: secret.trim(), label: label.trim() },
      }),
    onSuccess: () => {
      setError(null)
      setClientId("")
      setSecret("")
      setLabel("")
      invalidate()
      toast("App registered")
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not register the app.")),
  })
  const remove = useMutation({
    mutationFn: (c: AppCredential) => apiFetch(`/app-credentials/${c.id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (err) => toast.error(errorText(err, "Could not remove it.")),
  })

  const name = (s: string) => connectors.data?.find((c) => c.slug === s)?.display_name ?? s

  return (
    <Block title="Your own apps" aside={ownApp.map((c) => c.display_name).join(" · ")}>
      <p className="mb-5 max-w-[560px] text-[14px] leading-[1.6] text-ink-55">
        Some platforms only let you publish through an app you registered yourself. The client secret is encrypted and
        never shown again.
      </p>
      <ul className="border-t border-hair empty:border-0">
        {(creds.data ?? []).map((c) => (
          <li key={c.id} className="flex items-center gap-4 border-b border-hair py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">
                {name(c.connector_slug)}
                {c.label && <span className="font-normal text-ink-55"> · {c.label}</span>}
              </span>
              <span className="eyebrow mt-0.5 block truncate">
                {c.client_id} · added {formatStamp(c.created_at)}
              </span>
            </span>
            <TextButton type="button" tone="muted" onClick={() => remove.mutate(c)}>
              Remove
            </TextButton>
          </li>
        ))}
      </ul>
      {ownApp.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add.mutate()
          }}
          className="mt-6 grid gap-6 sm:grid-cols-2"
        >
          <SelectField label="Platform" value={chosen} onChange={(e) => setSlug(e.target.value)}>
            {ownApp.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.display_name}
              </option>
            ))}
          </SelectField>
          <Field label="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Field label="Client id" value={clientId} onChange={(e) => setClientId(e.target.value)} errors={error?.fieldErrors.client_id} />
          <Field
            label="Client secret"
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            errors={error?.fieldErrors.client_secret}
          />
          {error && !error.fieldErrors.client_id && !error.fieldErrors.client_secret && (
            <p className="text-[13px] text-rust sm:col-span-2">{error.detail}</p>
          )}
          <div className="sm:col-span-2">
            <OutlineButton type="submit" disabled={!clientId.trim() || !secret.trim() || add.isPending}>
              Register app
            </OutlineButton>
          </div>
        </form>
      )}
    </Block>
  )
}

function NewWorkspaceBlock() {
  const { createWorkspace, isCreating } = useWorkspace()
  const [name, setName] = useState("")
  return (
    <Block title="Another workspace">
      <p className="mb-5 max-w-[560px] text-[14px] leading-[1.6] text-ink-55">
        A separate set of channels, drafts and posts — for a client, or a second brand. Switch between them from the
        sidebar.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          createWorkspace(name.trim())
            .then((w) => {
              setName("")
              toast(`Switched to ${w.name}`)
            })
            .catch(() => {})
        }}
        className="flex flex-wrap items-end gap-6"
      >
        <Field label="Name" className="min-w-[240px] flex-1" value={name} onChange={(e) => setName(e.target.value)} />
        <OutlineButton type="submit" disabled={!name.trim() || isCreating}>
          {isCreating ? "Creating…" : "Create workspace"}
        </OutlineButton>
      </form>
    </Block>
  )
}
