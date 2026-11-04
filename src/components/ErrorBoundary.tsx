import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"

/**
 * Catches render errors so a bug shows a way out instead of a white screen.
 * Also catches a failed lazy-route download (e.g. after a deploy replaced
 * the old chunks), where reloading is the fix.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error", error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex min-h-screen flex-col items-start justify-center gap-6 bg-page px-6 text-ink sm:px-16">
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
}
