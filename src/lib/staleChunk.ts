// When a deploy replaces the app's files while a tab is open, that tab's
// next lazy screen fails to download. Reloading picks up the new files.

const RELOADED_AT = "omnipost:chunk-reload"

/** A lazy screen's file is gone, typically because a deploy replaced it while this tab was open. */
export function isStaleChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(message)
}

/**
 * Reloads once to pick up the new files, but never in a loop: a second
 * failure within a minute shows the error screen instead.
 */
export function reloadForStaleChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem(RELOADED_AT, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
