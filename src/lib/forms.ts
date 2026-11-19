import { ApiError } from "@/lib/api"

/** Field errors that don't belong to a rendered input, as one sentence. */
export function formLevelMessage(
  error: { detail: string; fieldErrors: Record<string, string[]> } | null | undefined,
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

/** Any thrown value as an ApiError, with a fallback sentence for network failures and the like. */
export function asApiError(err: unknown, fallback: string): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, fallback)
}
