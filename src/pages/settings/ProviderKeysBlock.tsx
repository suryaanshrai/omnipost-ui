import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { OutlineButton, TextButton } from "@/components/editorial/Buttons"
import Field, { SelectField } from "@/components/editorial/Field"
import { apiFetch, ApiError } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { useWorkspace } from "@/lib/workspace"
import type { AIProvider, ProviderKey } from "@/types/api"
import { useWorkspaceList, errorText } from "./shared"

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "openrouter", label: "OpenRouter" },
]

export function ProviderKeysBlock() {
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
            <TextButton type="button" tone="muted" onClick={() => window.confirm("Remove this? It can't be undone.") && remove.mutate(k)}>
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
