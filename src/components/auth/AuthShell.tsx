import type { ReactNode } from "react"
import { Link } from "react-router"
import Blip from "@/components/editorial/Blip"
import Constellation from "@/components/editorial/Constellation"
import Wordmark from "@/components/editorial/Wordmark"

/** The two-column frame shared by sign-in, sign-up and the password/email pages. */
export default function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid min-h-screen bg-page text-ink md:grid-cols-2">
      <div className="flex min-h-screen flex-col justify-between px-4 py-8 sm:px-12 sm:py-11">
        <Link to="/" aria-label="OmniPost home" className="self-start">
          <Wordmark />
        </Link>

        <div className="rise-in w-full max-w-[390px] py-12">
          <Blip className="mb-6">{eyebrow}</Blip>
          <h1 className="display text-[40px] leading-[1.02] sm:text-[46px]">{title}</h1>
          {children}
        </div>

        <div className="flex items-center justify-between border-t border-hair pt-5">
          <span className="eyebrow">Eleven platforms, one composer</span>
          <span className="eyebrow">Open source</span>
        </div>
      </div>

      <div className="theme-night relative hidden md:block">
        <Constellation density={0.9} className="absolute inset-0" />
        <Blip className="pointer-events-none absolute bottom-11 left-12">Live dispatch · every channel</Blip>
      </div>
    </div>
  )
}

/** Field errors that don't belong to a rendered input, as one sentence. */
export function formLevelMessage(
  error: { detail: string; fieldErrors: Record<string, string[]> } | null,
  shownFields: string[]
): string {
  if (!error) return ""
  const fieldErrors = error.fieldErrors
  const shown = new Set(shownFields)
  const rest = [
    ...(fieldErrors.non_field_errors ?? []),
    ...Object.entries(fieldErrors)
      .filter(([k]) => k !== "non_field_errors" && !shown.has(k))
      .flatMap(([, v]) => v),
  ]
  if (rest.length) return rest.join(" ")
  return Object.keys(fieldErrors).length ? "" : error.detail
}
