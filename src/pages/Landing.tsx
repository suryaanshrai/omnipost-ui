import { Link } from "react-router"
import Blip from "@/components/editorial/Blip"
import Constellation from "@/components/editorial/Constellation"
import CursorRing from "@/components/editorial/CursorRing"
import FilmGrain from "@/components/editorial/FilmGrain"
import HoverRow from "@/components/editorial/HoverRow"
import MagneticLink from "@/components/editorial/MagneticLink"
import Reveal from "@/components/editorial/Reveal"
import SectionHeader from "@/components/editorial/SectionHeader"
import Wordmark from "@/components/editorial/Wordmark"
import LandingNav from "@/components/landing/LandingNav"
import LandingRail from "@/components/landing/LandingRail"
import Manifesto from "@/components/landing/Manifesto"
import Marquee from "@/components/landing/Marquee"
import { LANDING_PLATFORMS, platformTint } from "@/lib/platforms"
import { cn } from "@/lib/utils"

const CAPABILITIES = [
  {
    title: "One composer, every format",
    desc: "Text, image, video, short video, and story posts written once and shaped per platform.",
  },
  { title: "Scheduling that holds", desc: "Pick the hour, or let each channel's queue slots pick it. The queue publishes without you at the desk." },
  { title: "Drafts that wait", desc: "Save now, choose the accounts later, publish when the moment is right." },
  { title: "Honest delivery reports", desc: "Per-platform confirmations and plain-language errors, not a silent failure." },
  { title: "Multiple instances", desc: "Several accounts per platform, each addressable on its own." },
]

const FLOW = [
  { num: "01", title: "Connect", desc: "Link each account you publish to." },
  { num: "02", title: "Compose", desc: "Write the caption, attach media, set the hour it should go out." },
  { num: "03", title: "Dispatch", desc: "OmniPost publishes to every selected channel and reports what landed." },
]

const TIERS = [
  {
    name: "Free",
    price: "$0",
    blurb: "One account per platform, unlimited drafts.",
    features: ["1 instance per platform", "Unlimited drafts", "Manual publishing", "Delivery notifications"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    blurb: "For anyone posting across every platform, every week.",
    features: ["Unlimited instances", "Scheduled publishing", "Priority queue", "Full delivery history", "Email support"],
    cta: "Start trial",
    featured: true,
  },
  {
    name: "Team",
    price: "$49",
    blurb: "Shared drafts and publishing for small teams.",
    features: ["Everything in Pro", "5 seats", "Shared draft library", "Role permissions"],
    cta: "Talk to us",
    featured: false,
  },
]

const HERO_CHANNELS = ["Instagram", "LinkedIn", "Bluesky", "Mastodon", "+ 7 more"]

// Shared horizontal rhythm: 16px gutters on phones, 40px from sm, and on
// lg the left edge clears the fixed section rail (108px).
const GUTTER = "px-4 sm:px-10 lg:pl-[108px]"

export default function Landing() {
  return (
    <div className="landing-root theme-day min-h-screen overflow-x-clip bg-page text-ink">
      <FilmGrain opacity={0.3} />
      <CursorRing />
      <LandingNav />
      <LandingRail />

      {/* Hero */}
      <section
        id="top"
        className="relative grid min-h-screen grid-cols-1 gap-12 px-4 pt-[120px] pb-12 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-10 lg:pt-[150px] lg:pr-0 lg:pb-[70px] lg:pl-[108px]"
      >
        <div className="rise-in flex flex-col justify-center">
          <Blip className="mb-8">Publishing infrastructure for one voice</Blip>
          <h1 className="display text-[clamp(56px,7.4vw,116px)] leading-[.92]">
            One post,
            <br />
            <em className="text-rust italic">every</em> platform.
          </h1>
          <p className="mt-9 max-w-[404px] text-[16px] leading-[1.6] text-pretty text-ink-55">
            Write once. OmniPost dispatches it to every network you keep, on your schedule, and tells you exactly
            what landed.
          </p>
          <div className="mt-11 flex flex-wrap items-center gap-8">
            <MagneticLink
              as={Link}
              to="/register"
              className="inline-block bg-ink px-[30px] py-[17px] text-[11.5px] font-bold tracking-[0.18em] text-page uppercase transition-colors duration-300 hover:bg-rust"
            >
              Start publishing
            </MagneticLink>
            <a
              href="#craft"
              className="border-b border-ink pb-1 text-[11px] font-bold tracking-[0.18em] uppercase transition-colors hover:border-rust hover:text-rust"
            >
              See the craft
            </a>
          </div>
        </div>

        <div className="theme-night relative -mx-4 h-[56vh] min-h-[340px] sm:-mx-10 lg:mx-0 lg:h-[min(78vh,660px)] lg:self-center">
          <Constellation density={1} className="absolute inset-0" />
          <ul className="pointer-events-none absolute top-7 right-7 flex flex-col items-end gap-2">
            {HERO_CHANNELS.map((c) => (
              <li key={c} className="eyebrow">
                {c}
              </li>
            ))}
          </ul>
          <Blip className="pointer-events-none absolute bottom-7 left-7">Live dispatch · every channel</Blip>
        </div>

        <div className="flex items-center justify-between border-t border-hair pt-5 lg:col-span-2 lg:mr-10">
          <span className="eyebrow">Eleven platforms, one composer</span>
          <span className="eyebrow">Scroll ↓</span>
        </div>
      </section>

      <Manifesto />
      <Marquee />

      {/* Craft */}
      <section id="craft" className={cn(GUTTER, "py-24 sm:py-32 sm:pr-10")}>
        <Reveal>
          <SectionHeader
            as="h2"
            size="landing"
            eyebrow="02 · Craft"
            title={
              <>
                What it does, <em className="text-rust italic">precisely</em>
              </>
            }
            aside="05 capabilities"
          />
        </Reveal>
        <div>
          {CAPABILITIES.map((c, i) => (
            <Reveal key={c.title} delayMs={i * 70}>
              <HoverRow className="grid grid-cols-[56px_1fr] items-center gap-x-4 gap-y-2 px-2 py-7 sm:grid-cols-[104px_1fr_1.06fr_56px] sm:gap-6 sm:px-4">
                <HoverRow.Num className="text-[34px] text-ink/[.22] sm:text-[44px]">0{i + 1}</HoverRow.Num>
                <HoverRow.Title className="display text-[24px] sm:text-[30px]">{c.title}</HoverRow.Title>
                <HoverRow.Desc className="col-start-2 text-[15px] leading-[1.6] text-pretty sm:col-start-auto">
                  {c.desc}
                </HoverRow.Desc>
                <HoverRow.Arrow className="hidden justify-self-end text-xl sm:block" />
              </HoverRow>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Flow */}
      <section id="flow" className={cn("theme-night", GUTTER, "py-24 sm:py-32 sm:pr-10")}>
        <Reveal>
          <SectionHeader
            as="h2"
            size="landing"
            eyebrow="03 · The flow"
            title={
              <>
                From one draft to <em className="text-ember italic">every</em> feed
              </>
            }
          />
        </Reveal>
        <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {FLOW.map((step, i) => (
            <Reveal key={step.num} delayMs={i * 70} className={cn(i === 1 && "md:mt-[54px]", i === 2 && "md:mt-[108px]")}>
              <div className="relative border-t border-hair pt-8">
                <span className="absolute -top-[3.5px] left-0 h-[6px] w-[6px] rounded-full bg-ember" aria-hidden="true" />
                <div className="display text-[76px] leading-none text-ink/[.24]">{step.num}</div>
                <h3 className="display mt-4 text-[32px]">{step.title}</h3>
                <p className="mt-3 max-w-[300px] text-[15px] leading-[1.6] text-pretty text-ink-55">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className={cn(GUTTER, "py-24 sm:py-32 sm:pr-10")}>
        <Reveal>
          <SectionHeader
            as="h2"
            size="landing"
            eyebrow="04 · Platforms"
            title={
              <>
                Where it <em className="text-rust italic">publishes</em>
              </>
            }
            aside="Official APIs"
          />
        </Reveal>
        <div>
          {LANDING_PLATFORMS.map((p, i) => (
            <Reveal key={p.slug} delayMs={Math.min(i, 6) * 70}>
              <HoverRow
                tint={platformTint(p.slug)}
                data-tint
                className="grid grid-cols-1 items-center gap-2 px-2 py-6 sm:grid-cols-[1fr_1fr_150px] sm:gap-6 sm:px-4"
              >
                <HoverRow.Title className="display text-[clamp(30px,3.6vw,50px)] leading-[1.05] group-hover:text-ink">
                  {p.name}
                </HoverRow.Title>
                <HoverRow.Desc className="text-[15px] leading-[1.6] text-pretty group-hover:text-ink-55">
                  {p.description}
                </HoverRow.Desc>
                <span className="eyebrow sm:text-right">
                  {p.formats.length} {p.formats.length === 1 ? "format" : "formats"}
                </span>
              </HoverRow>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={cn(GUTTER, "py-24 sm:py-32 sm:pr-10")}>
        <Reveal>
          <SectionHeader
            as="h2"
            size="landing"
            eyebrow="05 · Pricing"
            title={
              <>
                Pricing, without the <em className="text-rust italic">theatre</em>
              </>
            }
            aside="Placeholder tiers"
          />
        </Reveal>
        <div className="grid md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal
              key={tier.name}
              delayMs={i * 70}
              className={cn(
                "flex flex-col border-b border-hair py-10 md:border-b-0 md:px-8 md:py-12",
                i > 0 && "md:border-l",
                i === 0 && "md:pl-0"
              )}
            >
              <div className="flex items-center gap-2.5">
                {tier.featured && <span className="h-[6px] w-[6px] rounded-full bg-rust" aria-label="Recommended" />}
                <span className="eyebrow text-ink">{tier.name}</span>
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="display text-[60px] leading-none">{tier.price}</span>
                <span className="eyebrow">/ mo</span>
              </div>
              <p className="mt-5 max-w-[280px] text-[15px] leading-[1.6] text-pretty text-ink-55">{tier.blurb}</p>
              <ul className="mt-7 flex-1 space-y-3 border-t border-hair pt-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-3 text-[14px] text-ink">
                    <span className="text-ink-38">—</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={cn(
                  "mt-9 self-start text-[11px] font-bold tracking-[0.18em] uppercase transition-colors duration-300",
                  tier.featured
                    ? "bg-ink px-[26px] py-[15px] text-page hover:bg-rust"
                    : "border-b border-ink pb-1 hover:border-rust hover:text-rust"
                )}
              >
                {tier.cta}
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="theme-night relative flex min-h-[88vh] flex-col justify-center overflow-hidden px-4 py-24 sm:px-10 lg:pl-[108px]">
        <div className="absolute inset-0 opacity-[.62]">
          <Constellation density={0.62} className="absolute inset-0" />
        </div>
        <div className="pointer-events-none relative">
          <Reveal>
            <div className="eyebrow mb-8">Ready when you are</div>
            <h2 className="display text-[clamp(42px,6.4vw,104px)] leading-[.95]">
              Stop posting the
              <br />
              same thing <em className="text-ember italic">thrice</em>.
            </h2>
          </Reveal>
          <Reveal delayMs={140} className="pointer-events-auto mt-12 inline-block">
            <MagneticLink
              as={Link}
              to="/register"
              className="inline-block bg-ink px-[34px] py-[19px] text-[12px] font-bold tracking-[0.18em] text-page uppercase transition-colors duration-300 hover:bg-ember"
            >
              Start publishing
            </MagneticLink>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="grid gap-10 border-t border-hair px-4 py-14 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-10 lg:pl-[108px]">
        <div>
          <Wordmark />
          <p className="eyebrow mt-4">© 2026 · One post, every platform</p>
        </div>
        <ul className="space-y-3 text-[13px]">
          <li>
            <a href="#craft" className="hover:text-rust">
              Capabilities
            </a>
          </li>
          <li>
            <a href="#platforms" className="hover:text-rust">
              Platforms
            </a>
          </li>
        </ul>
        <ul className="space-y-3 text-[13px]">
          <li>
            <a href="#pricing" className="hover:text-rust">
              Pricing
            </a>
          </li>
          <li>
            <Link to="/login" className="hover:text-rust">
              Sign in
            </Link>
          </li>
        </ul>
      </footer>
    </div>
  )
}
