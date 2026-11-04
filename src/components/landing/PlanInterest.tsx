import { useState } from "react"
import type { FormEvent } from "react"
import { apiFetch, ApiError } from "@/lib/api"

/** "Tell me when": records interest in a hosted plan before it's for sale. */
export default function PlanInterest({ plan }: { plan: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState("sending")
    try {
      await apiFetch("/public/interest/", { method: "POST", body: { email: email.trim(), plan }, anonymous: true })
      setState("done")
    } catch (err) {
      setState("error")
      setMessage(err instanceof ApiError ? err.detail : "Couldn't send that. Try again in a moment.")
    }
  }

  if (state === "done") return <p className="mt-9 text-[14px] text-ink">Thanks. We'll email you when it opens.</p>
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-9 min-h-6 self-start border-b border-ink pb-1 text-[11px] font-bold tracking-[0.18em] uppercase transition-colors duration-300 hover:border-rust hover:text-rust"
      >
        Tell me when it opens
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="mt-9 flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="eyebrow">Email</span>
        <input
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-11 border-b border-hair bg-transparent text-[15px] text-ink focus:border-ink focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={state === "sending" || !email.trim()}
        className="self-start bg-ink px-[22px] py-[12px] text-[11px] font-bold tracking-[0.18em] text-page uppercase hover:bg-rust disabled:opacity-40"
      >
        {state === "sending" ? "Sending…" : "Notify me"}
      </button>
      {state === "error" && <p className="text-[13px] text-rust">{message}</p>}
    </form>
  )
}
