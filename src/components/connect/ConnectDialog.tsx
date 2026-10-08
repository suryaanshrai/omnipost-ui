import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import Field from "@/components/editorial/Field"
import Modal from "@/components/editorial/Modal"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import {
  fieldHint,
  fieldLabel,
  isMissingAppCredential,
  isSecretField,
  OAUTH_STASH_KEY,
  oauthRedirectUri,
  type OAuthStash,
} from "@/lib/connectors"
import { useWorkspace } from "@/lib/workspace"
import type { AppCredential, Channel, Connector, OAuthStartResult } from "@/types/api"

type Step = "app" | "method" | "oauth" | "credentials"

/**
 * Connect one account for a connector, choosing the path its capabilities
 * call for:
 *   requires_own_app without an AppCredential → register the app first;
 *   supports_oauth → (extra fields, e.g. a Mastodon instance) → redirect;
 *   credential_fields → one ruled input per field → POST /channels/.
 * Mastodon offers both OAuth and pasted credentials, so it gets a choice.
 */
export default function ConnectDialog({
  connector,
  open,
  onOpenChange,
}: {
  connector: Connector
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const appCredentials = useQuery({
    queryKey: ["app-credentials", activeWorkspace.id],
    queryFn: () => apiFetch<Page<AppCredential>>(`/app-credentials/?workspace=${activeWorkspace.id}&limit=200`),
    select: (page) => page.results,
    enabled: connector.requires_own_app,
  })
  const hasAppCredential = (appCredentials.data ?? []).some((a) => a.connector_slug === connector.slug)

  const firstStep = (): Step => {
    if (connector.supports_oauth && connector.credential_fields.length) return "method"
    if (connector.supports_oauth) return "oauth"
    return "credentials"
  }
  const [chosen, setChosen] = useState<Step | null>(null)
  const needsApp = connector.requires_own_app && appCredentials.isSuccess && !hasAppCredential
  const step: Step = needsApp ? "app" : (chosen ?? firstStep())

  const [displayName, setDisplayName] = useState("")
  const [values, setValues] = useState<Record<string, string>>({})
  const [app, setApp] = useState({ client_id: "", client_secret: "", label: "" })
  const [error, setError] = useState<ApiError | null>(null)

  const setValue = (name: string, value: string) => setValues((prev) => ({ ...prev, [name]: value }))

  const registerApp = useMutation({
    mutationFn: () =>
      apiFetch<AppCredential>("/app-credentials/", {
        method: "POST",
        body: { workspace: activeWorkspace.id, connector_slug: connector.slug, ...app },
      }),
    onSuccess: () => {
      setError(null)
      toast(`${connector.display_name} app registered`)
      return queryClient.invalidateQueries({ queryKey: ["app-credentials", activeWorkspace.id] })
    },
    onError: (err) => setError(err instanceof ApiError ? err : null),
  })

  const startOAuth = useMutation({
    mutationFn: () => {
      const redirect_uri = oauthRedirectUri()
      const extra = Object.fromEntries(connector.oauth_extra_fields.map((f) => [f, (values[f] ?? "").trim()]))
      return apiFetch<OAuthStartResult>("/oauth/start/", {
        method: "POST",
        body: {
          connector_slug: connector.slug,
          workspace: activeWorkspace.id,
          display_name: displayName.trim() || connector.display_name,
          redirect_uri,
          extra,
        },
      }).then((result) => ({ result, redirect_uri }))
    },
    onSuccess: ({ result, redirect_uri }) => {
      const stash: OAuthStash = { connector_slug: connector.slug, redirect_uri }
      sessionStorage.setItem(OAUTH_STASH_KEY, JSON.stringify(stash))
      window.location.assign(result.authorize_url)
    },
    onError: (err) => {
      if (err instanceof ApiError && isMissingAppCredential(err.detail)) {
        // Expected state, not a failure: send them to register the app.
        queryClient.invalidateQueries({ queryKey: ["app-credentials", activeWorkspace.id] })
        setChosen(null)
        setError(null)
        return
      }
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not start the sign-in."))
    },
  })

  const createChannel = useMutation({
    mutationFn: () =>
      apiFetch<Channel>("/channels/", {
        method: "POST",
        body: {
          workspace: activeWorkspace.id,
          connector_slug: connector.slug,
          display_name: displayName.trim() || connector.display_name,
          credentials: Object.fromEntries(connector.credential_fields.map((f) => [f, (values[f] ?? "").trim()])),
        },
      }),
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ["channels", activeWorkspace.id] })
      toast(`${channel.display_name} connected`)
      onOpenChange(false)
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not connect the account.")),
  })

  const pending = registerApp.isPending || startOAuth.isPending || createChannel.isPending

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (step === "app") registerApp.mutate()
    else if (step === "oauth") startOAuth.mutate()
    else if (step === "credentials") createChannel.mutate()
  }

  const fieldErrors = error?.fieldErrors ?? {}
  const shownKeys = new Set(["display_name", "client_id", "client_secret", "label", ...connector.credential_fields])
  const formError = error
    ? Object.keys(fieldErrors).some((k) => shownKeys.has(k))
      ? Object.entries(fieldErrors)
          .filter(([k]) => !shownKeys.has(k))
          .flatMap(([, v]) => v)
          .join(" ")
      : error.detail
    : ""

  const missingRequired =
    step === "app"
      ? !app.client_id.trim() || !app.client_secret.trim()
      : step === "oauth"
        ? connector.oauth_extra_fields.some((f) => !(values[f] ?? "").trim())
        : step === "credentials"
          ? connector.credential_fields.some((f) => !(values[f] ?? "").trim())
          : true

  const titles: Record<Step, string> = {
    app: "Register your own app",
    method: `Connect ${connector.display_name}`,
    oauth: `Connect ${connector.display_name}`,
    credentials: `Connect ${connector.display_name}`,
  }
  const descriptions: Record<Step, string> = {
    app: `${connector.display_name} only lets each workspace publish through an app it registered itself. Paste that app's client id and secret — the secret is encrypted and never shown again.`,
    method: "Sign in through the platform, or paste an access token you created yourself.",
    oauth: "You'll be sent to the platform to approve access, then brought back here.",
    credentials: "Stored encrypted. OmniPost only uses them to publish what you dispatch.",
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !pending && onOpenChange(o)}
      eyebrow={step === "app" ? `${connector.display_name} · Step one` : "Connect"}
      title={titles[step]}
      description={descriptions[step]}
      footer={
        <>
          <div>
            {chosen && connector.supports_oauth && connector.credential_fields.length > 0 && step !== "app" && (
              <TextButton type="button" tone="muted" onClick={() => setChosen(null)} disabled={pending}>
                ← Back
              </TextButton>
            )}
          </div>
          <div className="flex items-center gap-6">
            <TextButton type="button" tone="muted" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </TextButton>
            {step !== "method" && (
              <PrimaryButton type="submit" form="connect-form" disabled={pending || missingRequired || appCredentials.isLoading}>
                {pending
                  ? "One moment…"
                  : step === "app"
                    ? "Register app"
                    : step === "oauth"
                      ? `Continue to ${connector.display_name}`
                      : "Connect"}
              </PrimaryButton>
            )}
          </div>
        </>
      }
    >
      {step === "method" ? (
        <div className="border-t border-hair">
          {[
            { to: "oauth" as const, label: `Sign in with ${connector.display_name}`, desc: "Approve access on the platform." },
            { to: "credentials" as const, label: "Paste an access token", desc: "For an app you registered on your instance." },
          ].map((m) => (
            <button
              key={m.to}
              type="button"
              onClick={() => setChosen(m.to)}
              className="group grid w-full grid-cols-[1fr_24px] items-center border-b border-hair px-2 py-4 text-left transition-colors hover:bg-ink"
            >
              <span>
                <span className="block text-[13px] font-bold tracking-[0.14em] text-ink uppercase group-hover:text-page">
                  {m.label}
                </span>
                <span className="mt-1 block text-[13px] text-ink-55 group-hover:text-page/65">{m.desc}</span>
              </span>
              <span className="text-rust opacity-0 transition-opacity group-hover:opacity-100">→</span>
            </button>
          ))}
        </div>
      ) : (
        <form id="connect-form" onSubmit={submit} className="flex flex-col gap-6" noValidate>
          {step === "app" ? (
            <>
              <Field
                label="Client id"
                autoFocus
                value={app.client_id}
                onChange={(e) => setApp({ ...app, client_id: e.target.value })}
                errors={fieldErrors.client_id}
              />
              <Field
                label="Client secret"
                type="password"
                autoComplete="off"
                value={app.client_secret}
                onChange={(e) => setApp({ ...app, client_secret: e.target.value })}
                errors={fieldErrors.client_secret}
              />
              <Field
                label="Label (optional)"
                value={app.label}
                onChange={(e) => setApp({ ...app, label: e.target.value })}
                errors={fieldErrors.label}
                hint={`Register the redirect URL ${oauthRedirectUri()} with the app.`}
              />
            </>
          ) : (
            <>
              <Field
                label="Account name"
                autoFocus
                placeholder={`e.g. Studio ${connector.display_name}`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                errors={fieldErrors.display_name}
                hint="How this account shows up on chips and in the delivery log."
              />
              {(step === "oauth" ? connector.oauth_extra_fields : connector.credential_fields).map((f) => (
                <Field
                  key={f}
                  label={fieldLabel(f)}
                  type={isSecretField(f) ? "password" : "text"}
                  autoComplete="off"
                  value={values[f] ?? ""}
                  onChange={(e) => setValue(f, e.target.value)}
                  hint={fieldHint(f)}
                  errors={fieldErrors[f]}
                />
              ))}
            </>
          )}
          {formError && (
            <p role="alert" className="text-[13px] leading-[1.5] text-rust">
              {formError}
            </p>
          )}
        </form>
      )}
    </Modal>
  )
}
