import { useEffect, useRef } from "react"
import { formLevelMessage } from "@/lib/forms"
import { cn } from "@/lib/utils"

/**
 * The one sentence under a form when submitting it failed: errors that no
 * field shows itself (`fields` lists the ones that do), or a plain
 * `message`.
 *
 * Announced as an alert. When the server marked fields invalid, focus moves
 * to the first of them, so a keyboard or screen-reader user lands on what
 * needs fixing (modern-web-guidance `forms`: "move focus to the first
 * invalid field ... when a form submission fails").
 */
export default function FormError({
  error,
  fields = [],
  message,
  className,
}: {
  error?: { detail: string; fieldErrors: Record<string, string[]> } | null
  fields?: string[]
  message?: string | null
  className?: string
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const text = message ?? formLevelMessage(error, fields)

  useEffect(() => {
    if (!error || !Object.keys(error.fieldErrors).length) return
    const form = anchor.current?.closest("form")
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [error])

  return (
    <>
      <span ref={anchor} hidden />
      {text && (
        <p ref={ref} role="alert" className={cn("text-[13px] leading-[1.5] text-rust", className)}>
          {text}
        </p>
      )}
    </>
  )
}
