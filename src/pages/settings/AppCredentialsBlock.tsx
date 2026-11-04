import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { OutlineButton, TextButton } from "@/components/editorial/Buttons"
import { SelectField } from "@/components/editorial/Field"
import { apiFetch, ApiError } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { EMPTY_APP, useAppCredentials, useConnectors, useRegisterApp, type AppCredentialInput } from "@/lib/queries"
import AppCredentialFields from "@/components/connect/AppCredentialFields"
import { useWorkspace } from "@/lib/workspace"
import type { AppCredential } from "@/types/api"
import { errorText } from "./shared"

export function AppCredentialsBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const connectors = useConnectors()
  const creds = useAppCredentials()
  const ownApp = (connectors.data ?? []).filter((c) => c.requires_own_app)
  const [slug, setSlug] = useState("")
  const [app, setApp] = useState<AppCredentialInput>(EMPTY_APP)
  const [error, setError] = useState<ApiError | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["app-credentials", activeWorkspace.id] })
  const chosen = slug || ownApp[0]?.slug || ""

  const add = useRegisterApp()
  const register = () =>
    add.mutate(
      { slug: chosen, app },
      {
        onSuccess: () => {
          setError(null)
          setApp(EMPTY_APP)
          toast("App registered")
        },
        onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not register the app.")),
      }
    )
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
            register()
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
          <AppCredentialFields value={app} onChange={setApp} errors={error?.fieldErrors} />
          {error && !error.fieldErrors.client_id && !error.fieldErrors.client_secret && (
            <p className="text-[13px] text-rust sm:col-span-2">{error.detail}</p>
          )}
          <div className="sm:col-span-2">
            <OutlineButton type="submit" disabled={!app.client_id.trim() || !app.client_secret.trim() || add.isPending}>
              Register app
            </OutlineButton>
          </div>
        </form>
      )}
    </Block>
  )
}
