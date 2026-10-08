import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import Blip from "@/components/editorial/Blip"
import { PrimaryButton } from "@/components/editorial/Buttons"
import Constellation from "@/components/editorial/Constellation"
import Field from "@/components/editorial/Field"
import Wordmark from "@/components/editorial/Wordmark"
import useAuthContext from "@/contexts/authContext"
import { apiFetch, ApiError, setToken } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Token } from "@/types/api"

type Mode = "login" | "register"

const COPY: Record<Mode, { eyebrow: string; title: [string, string, string]; submit: string }> = {
  login: { eyebrow: "Welcome back", title: ["One post, ", "every", " platform."], submit: "Enter" },
  register: { eyebrow: "New account", title: ["Start publishing ", "everywhere", "."], submit: "Create account" },
}

/**
 * /login and /register as one screen: the tab *is* the route, so a tab
 * click navigates rather than toggling local state, and each URL is
 * shareable/bookmarkable on its own.
 */
export default function Auth({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { updateUser, updateToken, toggleSignedIn } = useAuthContext()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<{ mode: Mode; error: ApiError } | null>(null)
  // Switching tabs keeps what was typed but not the other form's errors.
  const error = failure?.mode === mode ? failure.error : null

  const copy = COPY[mode]
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
  const destination = from?.pathname && from.pathname.startsWith("/app") ? `${from.pathname}${from.search ?? ""}` : "/app"

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFailure(null)
    try {
      const body =
        mode === "login"
          ? { username, password }
          : { username, email, password1: password, password2: password }
      const { key } = await apiFetch<Token>(mode === "login" ? "/auth/login/" : "/auth/registration/", {
        method: "POST",
        body,
        anonymous: true,
      })
      setToken(key)
      // A previous session's cached workspaces/posts must never flash
      // into a different account's shell.
      queryClient.clear()
      updateToken(key)
      updateUser(username)
      toggleSignedIn(true)
      navigate(destination, { replace: true })
    } catch (err) {
      setFailure({
        mode,
        error: err instanceof ApiError ? err : new ApiError(0, "Could not reach the server. Try again in a moment."),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const fieldErrors = error?.fieldErrors ?? {}
  // Anything not attributable to a visible input (non_field_errors, a bare
  // detail, or a field this form doesn't render) shows under the form.
  const shown = new Set(["username", "email", "password", "password1", "password2"])
  const formLevel = [
    ...(fieldErrors.non_field_errors ?? []),
    ...Object.entries(fieldErrors)
      .filter(([k]) => k !== "non_field_errors" && !shown.has(k))
      .flatMap(([, v]) => v),
  ]
  const formMessage = formLevel.length ? formLevel.join(" ") : error && !Object.keys(fieldErrors).length ? error.detail : ""

  return (
    <div className="grid min-h-screen bg-page text-ink md:grid-cols-2">
      <div className="flex min-h-screen flex-col justify-between px-4 py-8 sm:px-12 sm:py-11">
        <Link to="/" aria-label="OmniPost home" className="self-start">
          <Wordmark />
        </Link>

        <div key={mode} className="rise-in w-full max-w-[390px] py-12">
          <Blip className="mb-6">{copy.eyebrow}</Blip>
          <h1 className="display text-[40px] leading-[1.02] sm:text-[46px]">
            {copy.title[0]}
            <em className="text-rust italic">{copy.title[1]}</em>
            {copy.title[2]}
          </h1>

          <div role="tablist" aria-label="Account" className="mt-10 flex gap-8 border-b border-hair">
            {(["login", "register"] as const).map((m) => (
              <Link
                key={m}
                role="tab"
                aria-selected={mode === m}
                to={m === "login" ? "/login" : "/register"}
                state={location.state}
                replace
                className={cn(
                  "-mb-px border-b pb-3 text-[11px] font-bold tracking-[0.18em] uppercase transition-colors",
                  mode === m ? "border-rust text-ink" : "border-transparent text-ink-45 hover:text-ink"
                )}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </Link>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-9 flex flex-col gap-7" noValidate>
            <Field
              label="Username"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              errors={fieldErrors.username}
            />
            {mode === "register" && (
              <Field
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                errors={fieldErrors.email}
              />
            )}
            <Field
              label="Password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              errors={[...(fieldErrors.password ?? []), ...(fieldErrors.password1 ?? []), ...(fieldErrors.password2 ?? [])]}
            />
            {formMessage && (
              <p role="alert" className="text-[13px] leading-[1.5] text-rust">
                {formMessage}
              </p>
            )}
            <PrimaryButton type="submit" disabled={submitting || !username || !password} className="mt-2 self-start">
              {submitting ? "One moment…" : copy.submit}
            </PrimaryButton>
          </form>
        </div>

        <div className="flex items-center justify-between border-t border-hair pt-5">
          <span className="eyebrow">Eleven platforms, one composer</span>
          <span className="eyebrow">2026</span>
        </div>
      </div>

      <div className="theme-night relative hidden md:block">
        <Constellation density={0.9} className="absolute inset-0" />
        <Blip className="pointer-events-none absolute bottom-11 left-12">Live dispatch · every channel</Blip>
      </div>
    </div>
  )
}
