import { Link } from "react-router"

/**
 * Placeholder — the full "Editorial Dispatch" landing page (fixed nav,
 * constellation hero, manifesto reveal, capability/platform/pricing
 * sections) is Phase B. This exists now only so `/` has something to
 * render once the app moved off it and onto /app/*; it uses the same
 * tokens (see src/index.css) the real page will use so this doesn't read
 * as a broken intermediate state.
 */
export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-page px-6 text-center text-ink">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl">OmniPost</span>
        <span className="eyebrow text-ink-38">v1</span>
      </div>
      <h1 className="font-display max-w-xl text-4xl leading-tight">
        One post, <span className="text-rust italic">every</span> platform.
      </h1>
      <p className="max-w-sm text-sm text-ink-55">
        The full landing page is on its way. In the meantime, sign in to get to your workspace.
      </p>
      <Link
        to="/login"
        className="bg-ink px-8 py-4 text-[11px] font-bold tracking-[0.16em] text-page uppercase transition-colors hover:bg-rust"
      >
        Sign in
      </Link>
    </div>
  )
}
