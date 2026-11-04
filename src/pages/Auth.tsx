import { useState } from "react"
import type { FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import AuthShell, { formLevelMessage } from "@/components/auth/AuthShell"
import { PrimaryButton } from "@/components/editorial/Buttons"
import Field from "@/components/editorial/Field"
import { apiFetch, ApiError, getToken, safeNextPath, setToken } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Token } from "@/types/api"

type Mode = "login" | "register"

const COPY: Record<Mode, { eyebrow: string; title: [string, string, string]; submit: string }> = {
  login: { eyebrow: "Welcome back", title: ["One post, ", "every", " platform."], submit: "Sign in" },
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
  const [params] = useSearchParams()
  const queryClient = useQueryClient()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<{ mode: Mode; error: ApiError } | null>(null)
  // Switching tabs keeps what was typed but not the other form's errors.
  const error = failure?.mode === mode ? failure.error : null

  const copy = COPY[mode]
  const destination = safeNextPath(params.get("next"))

  // Already signed in: straight to the app.
  if (getToken()) return <Navigate to={destination} replace />

  const mismatch = mode === "register" && confirm.length > 0 && confirm !== password

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (mismatch) return
    setSubmitting(true)
    setFailure(null)
    try {
      const body =
        mode === "login" ? { username, password } : { username, email, password1: password, password2: confirm }
      const { key } = await apiFetch<Token>(mode === "login" ? "/auth/login/" : "/auth/registration/", {
        method: "POST",
        body,
        anonymous: true,
      })
      setToken(key)
      // A previous session's cached workspaces/posts must never flash
      // into a different account's shell.
      queryClient.clear()
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
  const formMessage = formLevelMessage(error, ["username", "email", "password", "password1", "password2"])
  const canSubmit =
    !!username && !!password && (mode === "login" || (!!email && !!confirm && !mismatch)) && !submitting

  return (
    <AuthShell
      eyebrow={copy.eyebrow}
      title={
        <>
          {copy.title[0]}
          <em className="text-rust italic">{copy.title[1]}</em>
          {copy.title[2]}
        </>
      }
    >
      <div role="tablist" aria-label="Account" className="mt-10 flex gap-8 border-b border-hair">
        {(["login", "register"] as const).map((m) => (
          <Link
            key={m}
            role="tab"
            aria-selected={mode === m}
            to={{ pathname: m === "login" ? "/login" : "/register", search: location.search }}
            replace
            className={cn(
              "-mb-px border-b pb-3 text-[11px] font-bold tracking-[0.18em] uppercase transition-colors",
              mode === m ? "border-rust text-ink" : "border-transparent text-ink-55 hover:text-ink"
            )}
          >
            {m === "login" ? "Sign in" : "Create account"}
          </Link>
        ))}
      </div>

      <form key={mode} onSubmit={handleSubmit} className="mt-9 flex flex-col gap-7" noValidate>
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
            required
            hint="For password resets and alerts when a post fails."
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
          errors={[...(fieldErrors.password ?? []), ...(fieldErrors.password1 ?? [])]}
        />
        {mode === "register" && (
          <Field
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            errors={mismatch ? ["The passwords don't match."] : fieldErrors.password2}
          />
        )}
        {formMessage && (
          <p role="alert" className="text-[13px] leading-[1.5] text-rust">
            {formMessage}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-6">
          <PrimaryButton type="submit" disabled={!canSubmit}>
            {submitting ? "One moment…" : copy.submit}
          </PrimaryButton>
          {mode === "login" && (
            <Link to="/forgot-password" className="border-b border-hair text-[12px] text-ink-55 hover:text-ink">
              Forgot password?
            </Link>
          )}
        </div>
      </form>
    </AuthShell>
  )
}
