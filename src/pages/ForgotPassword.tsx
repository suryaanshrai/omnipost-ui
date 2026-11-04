import { useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router"
import AuthShell from "@/components/auth/AuthShell"
import { PrimaryButton } from "@/components/editorial/Buttons"
import Field from "@/components/editorial/Field"
import { apiFetch, ApiError } from "@/lib/api"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch("/auth/password/reset/", { method: "POST", body: { email }, anonymous: true })
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not reach the server. Try again in a moment."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title={
        <>
          Forgot your <em className="text-rust italic">password</em>?
        </>
      }
    >
      {sent ? (
        <div className="mt-9 flex flex-col gap-6" role="status">
          <p className="text-[15px] leading-[1.6] text-ink-55">
            If an account uses <strong className="text-ink">{email}</strong>, a reset link is on its way. It works
            once and expires after a few days.
          </p>
          <Link to="/login" className="self-start border-b border-ink text-[11px] font-bold tracking-[0.18em] uppercase">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-9 flex flex-col gap-7" noValidate>
          <p className="text-[15px] leading-[1.6] text-ink-55">Enter your account's email and we'll send a reset link.</p>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            errors={error?.fieldErrors.email}
          />
          {error && !error.fieldErrors.email && (
            <p role="alert" className="text-[13px] text-rust">
              {error.detail}
            </p>
          )}
          <div className="flex items-center justify-between gap-6">
            <PrimaryButton type="submit" disabled={!email || submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </PrimaryButton>
            <Link to="/login" className="border-b border-hair text-[12px] text-ink-55 hover:text-ink">
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
