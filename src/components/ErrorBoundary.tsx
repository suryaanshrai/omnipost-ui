import { useEffect } from "react"
import { useRouteError } from "react-router"
import { isStaleChunk, reloadForStaleChunk } from "@/lib/staleChunk"

/**
 * The router's error screen: a bug shows a way out instead of a white
 * screen. A failed lazy-route download reloads once by itself.
 */
export default function RouteError() {
  const error = useRouteError()
  const stale = isStaleChunk(error)

  useEffect(() => {
    console.error("Render error", error)
    if (stale) reloadForStaleChunk()
  }, [error, stale])

  return (
    <div role="alert" className="flex min-h-dvh flex-col items-start justify-center gap-6 bg-page px-6 text-ink sm:px-16">
      <div className="eyebrow">Something broke</div>
      <h1 className="display text-[40px] leading-[1.05]">This screen hit an error.</h1>
      <p className="max-w-[460px] text-[15px] leading-[1.6] text-ink-55">
        Reloading usually fixes it. Nothing you saved is lost.
      </p>
      <div className="flex gap-6">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-ink px-6 py-3.5 text-[11px] font-bold tracking-[0.18em] text-page uppercase hover:bg-rust"
        >
          Reload
        </button>
        <a href="/app" className="self-center border-b border-ink text-[11px] font-bold tracking-[0.18em] uppercase">
          Back to posts
        </a>
      </div>
    </div>
  )
}
