import { useEffect, useState } from "react"
import { Link } from "react-router"
import MagneticLink from "@/components/editorial/MagneticLink"
import Wordmark from "@/components/editorial/Wordmark"
import { getToken } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function LandingNav() {
  const signedIn = !!getToken()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-[300] flex items-center justify-between px-4 py-4 transition-[background-color,border-color] duration-500 sm:px-10 sm:py-[26px]",
        "border-b",
        scrolled ? "border-hair bg-page/92 backdrop-blur-[6px]" : "border-transparent"
      )}
    >
      <a href="#top" aria-label="OmniPost, back to top">
        <Wordmark />
      </a>
      <div className="flex items-center gap-5 sm:gap-8">
        <a
          href="#pricing"
          className="group relative hidden text-[11px] font-bold tracking-[0.18em] text-ink uppercase sm:inline-block"
        >
          Pricing
          <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-100" />
        </a>
        {signedIn ? (
          <Link to="/app" className="text-[11px] font-bold tracking-[0.18em] text-ink uppercase hover:text-rust">
            Dashboard
          </Link>
        ) : (
          <Link to="/login" className="text-[11px] font-bold tracking-[0.18em] text-ink uppercase hover:text-rust">
            Sign in
          </Link>
        )}
        <MagneticLink
          as={Link}
          to="/register"
          className="inline-block bg-ink px-4 py-3 text-[10.5px] font-bold tracking-[0.18em] text-page uppercase transition-colors duration-300 hover:bg-rust sm:px-[26px] sm:py-[15px]"
        >
          Get started
        </MagneticLink>
      </div>
    </nav>
  )
}
