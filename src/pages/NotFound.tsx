import { Link } from "react-router"
import Wordmark from "@/components/editorial/Wordmark"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-page px-4 py-8 text-ink sm:px-12 sm:py-11">
      <Link to="/" aria-label="OmniPost home" className="self-start">
        <Wordmark />
      </Link>
      <div className="rise-in max-w-[520px]">
        <div className="eyebrow mb-5">Not found</div>
        <h1 className="display text-[clamp(96px,16vw,180px)] leading-[.9]">
          4<em className="text-rust italic">0</em>4
        </h1>
        <p className="mt-6 max-w-[380px] text-[16px] leading-[1.6] text-pretty text-ink-55">
          Nothing was ever dispatched to this address.
        </p>
        <Link
          to="/"
          className="mt-9 inline-block border-b border-ink pb-1 text-[11px] font-bold tracking-[0.18em] uppercase hover:border-rust hover:text-rust"
        >
          ← Back home
        </Link>
      </div>
      <div className="border-t border-hair pt-5">
        <span className="eyebrow">OmniPost · 2026</span>
      </div>
    </div>
  )
}
