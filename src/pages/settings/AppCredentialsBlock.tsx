import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { OutlineButton, TextButton } from "@/components/editorial/Buttons"
import Field, { SelectField } from "@/components/editorial/Field"
import { apiFetch, ApiError } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { useConnectors } from "@/lib/queries"
import { useWorkspace } from "@/lib/workspace"
import type { AppCredential } from "@/types/api"
import { useWorkspaceList, errorText } from "./shared"

export function AppCredentialsBlock() {
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
