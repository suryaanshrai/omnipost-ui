import { useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { OutlineButton, PrimaryButton } from "@/components/editorial/Buttons"
import { apiFetch } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { useBilling } from "@/lib/queries"
import type { Plan } from "@/types/api"
import { errorText } from "./shared"

function limit(used: number | undefined, max: number | null | undefined) {
  return max == null ? `${used ?? 0}` : `${used ?? 0} of ${max}`
}

/** Your hosted plan. Hidden on a self-hosted install (no plans there). */
export default function BillingBlock() {
  const billing = useBilling()
  const [params] = useSearchParams()

  useEffect(() => {
    const result = params.get("billing")
    if (result === "success") toast("Thanks! Your plan updates in a moment.")
    if (result === "canceled") toast("Checkout canceled. Nothing was charged.")
  }, [params])

  const go = useMutation({
    mutationFn: (plan: string | null) =>
      apiFetch<{ url: string }>(plan ? "/billing/checkout/" : "/billing/portal/", {
        method: "POST",
        body: plan ? { plan } : {},
      }),
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (err) => toast.error(errorText(err, "Couldn't reach billing. Try again in a moment.")),
  })

  if (!billing.data?.enabled) return null
  const data = billing.data
  const current: Plan | undefined = data.plans.find((p) => p.id === data.plan)
  const upgrades = data.plans.filter((p) => p.purchasable && p.id !== data.plan)

  return (
    <Block title="Plan" aside={current?.name ?? data.plan}>
      <dl className="grid grid-cols-2 gap-6 text-[14px] sm:grid-cols-3">
        <div>
          <dt className="eyebrow">Channels</dt>
          <dd className="mt-1 font-semibold">{limit(data.usage.channels, current?.channels)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Scheduled now</dt>
          <dd className="mt-1 font-semibold">{limit(data.usage.scheduled_posts, current?.scheduled_posts)}</dd>
        </div>
        {data.renews_at && (
          <div>
            <dt className="eyebrow">{data.status === "past_due" ? "Payment due" : "Renews"}</dt>
            <dd className="mt-1 font-semibold">{formatStamp(data.renews_at)}</dd>
          </div>
        )}
      </dl>
      {data.status === "past_due" && (
        <p className="mt-4 text-[13.5px] text-rust">Your last payment didn't go through. Update your card to keep your plan.</p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {upgrades.map((p) => (
          <PrimaryButton key={p.id} type="button" disabled={go.isPending} onClick={() => go.mutate(p.id)}>
            {data.plan === "free" ? "Upgrade to" : "Switch to"} {p.name} · {p.price_display}
          </PrimaryButton>
        ))}
        {data.has_billing_account && (
          <OutlineButton type="button" disabled={go.isPending} onClick={() => go.mutate(null)}>
            Invoices, card, cancel
          </OutlineButton>
        )}
      </div>
    </Block>
  )
}
