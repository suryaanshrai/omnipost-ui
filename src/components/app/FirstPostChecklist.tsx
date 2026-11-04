import { Link } from "react-router"
import { useCompose } from "@/components/compose/compose-context"
import { useChannels, usePostCount } from "@/lib/queries"
import { cn } from "@/lib/utils"

/**
 * The empty Posts screen for someone new: three steps from nothing to a
 * delivered post, each ticking off as it's done.
 */
export default function FirstPostChecklist() {
  const { openCompose } = useCompose()
  const channels = useChannels()
  const drafts = usePostCount("draft")
  const hasChannel = (channels.data?.length ?? 0) > 0
  const hasDraft = (drafts.data ?? 0) > 0

  const steps = [
    {
      title: "Connect an account",
      desc: "Bluesky, Mastodon, Discord and Telegram connect in a minute with no developer app.",
      done: hasChannel,
      action: (
        <Link to="/app/connections" className="border-b border-ink text-[11px] font-bold tracking-[0.18em] uppercase">
          Connect
        </Link>
      ),
    },
    {
      title: "Write your first post",
      desc: "Write it once; OmniPost checks it against each network's limits as you type.",
      done: hasDraft,
      action: (
        <button
          type="button"
          onClick={() => openCompose()}
          disabled={!hasChannel}
          className="border-b border-ink text-[11px] font-bold tracking-[0.18em] uppercase disabled:border-hair disabled:text-ink-55"
        >
          Compose
        </button>
      ),
    },
    {
      title: "Publish it",
      desc: "Send it now or pick a time. It shows up here with a delivery report from every channel.",
      done: false,
      action: null,
    },
  ]

  return (
    <section aria-label="Get started" className="mt-10 border-t border-hair">
      <p className="mt-8 text-[15px] leading-[1.6] text-ink-55">Three steps to your first delivered post.</p>
      <ol className="mt-6">
        {steps.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[40px_1fr_auto] items-start gap-4 border-b border-hair py-6">
            <span
              className={cn("font-display text-[26px] leading-none", step.done ? "text-rust" : "text-ink-55")}
              aria-hidden="true"
            >
              {step.done ? "✓" : String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className={cn("text-[15px] font-semibold", step.done && "text-ink-55 line-through")}>
                {step.title}
                {step.done && <span className="sr-only"> (done)</span>}
              </h3>
              <p className="mt-1.5 max-w-[460px] text-[14px] leading-[1.6] text-ink-55">{step.desc}</p>
            </div>
            <div className="pt-1">{!step.done && step.action}</div>
          </li>
        ))}
      </ol>
    </section>
  )
}
