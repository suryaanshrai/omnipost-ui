/**
 * A URL from the API or a user, as an href that is safe to render: only
 * http(s), so a stored `javascript:` or `data:` link can't run in our
 * origin. Anything else is null; render it as plain text or not at all.
 */
export function safeHref(url: unknown): string | null {
  try {
    const parsed = new URL(String(url))
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null
  } catch {
    return null
  }
}
