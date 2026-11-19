import { useEffect, useRef, useState } from "react"
import { TextButton } from "./Buttons"

/**
 * Copies `value` to the clipboard and says so in place ("Copied" for two
 * seconds, announced politely). Works inside a modal, where a toast would
 * have to wait for it to close. If the clipboard is unavailable (an
 * insecure origin, a denied permission) it says so instead of failing
 * silently.
 */
export default function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = () => {
    const done = (next: "copied" | "failed") => {
      setState(next)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setState("idle"), 2000)
    }
    if (!navigator.clipboard) return done("failed")
    navigator.clipboard.writeText(value).then(
      () => done("copied"),
      () => done("failed")
    )
  }

  return (
    <TextButton onClick={copy}>
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Select and copy it instead" : label}</span>
    </TextButton>
  )
}
