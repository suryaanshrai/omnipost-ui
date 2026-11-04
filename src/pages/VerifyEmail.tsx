import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import AuthShell from "@/components/auth/AuthShell"
import { apiFetch, isSignedIn } from "@/lib/api"

/** The page the verification email links to: /verify-email?key=… */
export default function VerifyEmail() {
  const [params] = useSearchParams()
  const key = params.get("key") ?? ""
  const [state, setState] = useState<"working" | "done" | "failed">(key ? "working" : "failed")

  useEffect(() => {
    if (!key) return
    let cancelled = false
    apiFetch("/auth/registration/verify-email/", { method: "POST", body: { key }, anonymous: true })
      .then(() => !cancelled && setState("done"))
      .catch(() => !cancelled && setState("failed"))
    return () => {
      cancelled = true
    }
  }, [key])

  const next = isSignedIn() ? "/app" : "/login"
  return (
    <AuthShell
      eyebrow="Email"
      title={
        state === "done" ? (
          <>
            Email <em className="text-rust italic">confirmed</em>.
          </>
        ) : state === "failed" ? (
          <>
            That link didn't <em className="text-rust italic">work</em>.
          </>
        ) : (
          <>Confirming…</>
        )
      }
    >
      <div className="mt-9 flex flex-col gap-6" role="status">
        {state === "failed" && (
          <p className="text-[15px] leading-[1.6] text-ink-55">
            It may have expired or already been used. You can ask for a new one in Settings.
          </p>
        )}
        {state !== "working" && (
          <Link to={next} className="self-start border-b border-ink text-[11px] font-bold tracking-[0.18em] uppercase">
            {next === "/app" ? "Go to OmniPost" : "Sign in"}
          </Link>
        )}
      </div>
    </AuthShell>
  )
}
