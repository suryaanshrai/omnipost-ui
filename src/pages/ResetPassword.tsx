import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useSearchParams } from "react-router"
import AuthShell, { formLevelMessage } from "@/components/auth/AuthShell"
import { PrimaryButton } from "@/components/editorial/Buttons"
import Field from "@/components/editorial/Field"
import { apiFetch, ApiError } from "@/lib/api"

/** The page the reset email links to: /reset-password?uid=…&token=… */
export default function ResetPassword() {
  const [params] = useSearchParams()
  const uid = params.get("uid") ?? ""
  const token = params.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const mismatch = confirm.length > 0 && confirm !== password

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (mismatch) return
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch("/auth/password/reset/confirm/", {
        method: "POST",
        body: { uid, token, new_password1: password, new_password2: confirm },
        anonymous: true,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not reach the server. Try again in a moment."))
    } finally {
      setSubmitting(false)
    }
  }

  const linkProblem = error && (error.fieldErrors.token || error.fieldErrors.uid)
  const message = linkProblem
    ? "This reset link is invalid or has already been used. Ask for a new one."
    : formLevelMessage(error, ["new_password1", "new_password2"])

  return (
    <AuthShell
      eyebrow="Password reset"
      title={
        <>
          Choose a new <em className="text-rust italic">password</em>.
        </>
      }
    >
      {!uid || !token ? (
        <p className="mt-9 text-[15px] leading-[1.6] text-ink-55">
          This page needs the link from your reset email. <Link to="/forgot-password" className="border-b border-ink text-ink">Send a new one</Link>.
        </p>
      ) : done ? (
        <div className="mt-9 flex flex-col gap-6" role="status">
          <p className="text-[15px] leading-[1.6] text-ink-55">Your password is changed. Sign in with the new one.</p>
          <Link to="/login" className="self-start border-b border-ink text-[11px] font-bold tracking-[0.18em] uppercase">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-9 flex flex-col gap-7" noValidate>
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            errors={error?.fieldErrors.new_password1}
          />
          <Field
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            errors={mismatch ? ["The passwords don't match."] : error?.fieldErrors.new_password2}
          />
          {message && (
            <p role="alert" className="text-[13px] leading-[1.5] text-rust">
              {message} {linkProblem && <Link to="/forgot-password" className="border-b border-rust">Send a new link</Link>}
            </p>
          )}
          <PrimaryButton type="submit" className="self-start" disabled={!password || !confirm || mismatch || submitting}>
            {submitting ? "Saving…" : "Set password"}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  )
}
