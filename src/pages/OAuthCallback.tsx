import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Blip from "@/components/editorial/Blip"
import Wordmark from "@/components/editorial/Wordmark"
import { apiFetch, ApiError, getToken } from "@/lib/api"
import { OAUTH_STASH_KEY, type OAuthStash } from "@/lib/connectors"
import type { Channel } from "@/types/api"

/**
 * Where a connector's OAuth redirect lands: exchanges `code` + `state` via
 * /oauth/complete/ (with the slug and redirect_uri stashed before leaving)
 * and returns to Connections. An authorization code is single-use, so the
 * exchange is guarded against StrictMode's double effect run.
 */
export default function OAuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const providerError = params.get("error_description") || params.get("error")
    const code = params.get("code")
    const state = params.get("state")
    let stash: OAuthStash | null = null
    try {
      stash = JSON.parse(sessionStorage.getItem(OAUTH_STASH_KEY) ?? "null")
    } catch {
      stash = null
    }

    if (providerError) return setError(`The platform declined the connection: ${providerError}`)
    if (!getToken()) return setError("You were signed out during the connection. Sign in and connect again.")
    if (!stash) return setError("This sign-in wasn't started from this browser tab, or it already finished.")
    if (!code || !state) return setError("The platform didn't send back an authorization code.")

    apiFetch<Channel>("/oauth/complete/", {
      method: "POST",
      body: { connector_slug: stash.connector_slug, code, redirect_uri: stash.redirect_uri, state },
    })
      .then((channel) => {
        sessionStorage.removeItem(OAUTH_STASH_KEY)
        queryClient.invalidateQueries({ queryKey: ["channels"] })
        toast(`${channel.display_name} connected`)
        navigate("/app/connections", { replace: true })
      })
      .catch((err) => {
        sessionStorage.removeItem(OAUTH_STASH_KEY)
        setError(err instanceof ApiError ? err.detail : "Could not finish connecting the account.")
      })
  }, [params, navigate, queryClient])

  return (
    <div className="flex min-h-screen flex-col justify-between bg-page px-4 py-8 text-ink sm:px-12 sm:py-11">
      <Wordmark />
      <div className="rise-in max-w-[480px]">
        {error ? (
          <>
            <div className="eyebrow mb-5 text-rust">Connection failed</div>
            <h1 className="display text-[40px] leading-[1.05]">
              That didn't <em className="text-rust italic">land</em>.
            </h1>
            <p role="alert" className="mt-5 text-[15px] leading-[1.6] text-pretty text-ink-55">
              {error}
            </p>
            <Link
              to="/app/connections"
              className="mt-9 inline-block border-b border-ink pb-1 text-[11px] font-bold tracking-[0.18em] uppercase hover:border-rust hover:text-rust"
            >
              ← Back to connections
            </Link>
          </>
        ) : (
          <>
            <Blip className="mb-5">Connecting</Blip>
            <h1 className="display text-[40px] leading-[1.05]">
              Linking your <em className="text-rust italic">account</em>…
            </h1>
          </>
        )}
      </div>
      <div className="border-t border-hair pt-5">
        <span className="eyebrow">OmniPost · 2026</span>
      </div>
    </div>
  )
}
