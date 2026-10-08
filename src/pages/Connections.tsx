import { useState } from "react"
import { useNavigate } from "react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import HealthDot from "@/components/app/HealthDot"
import ConnectDialog from "@/components/connect/ConnectDialog"
import { TextButton } from "@/components/editorial/Buttons"
import ConfirmDialog from "@/components/editorial/ConfirmDialog"
import HoverRow from "@/components/editorial/HoverRow"
import Reveal from "@/components/editorial/Reveal"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, ApiError } from "@/lib/api"
import { connectorSummary } from "@/lib/connectors"
import { platformHue, platformTint } from "@/lib/platforms"
import { useChannels, useConnectors } from "@/lib/queries"
import { useWorkspace } from "@/lib/workspace"
import type { Channel, Connector } from "@/types/api"

export default function Connections() {
  const connectors = useConnectors()
  const channels = useChannels()
  const [connecting, setConnecting] = useState<Connector | null>(null)
  const [removing, setRemoving] = useState<Channel | null>(null)
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const connectorBySlug = new Map((connectors.data ?? []).map((c) => [c.slug, c]))
  const linkedCount = (slug: string) => (channels.data ?? []).filter((c) => c.connector_slug === slug).length

  const remove = useMutation({
    mutationFn: (channel: Channel) => apiFetch(`/channels/${channel.id}/`, { method: "DELETE" }),
    onSuccess: (_d, channel) => {
      toast(`${channel.display_name} removed`)
      setRemoving(null)
      queryClient.invalidateQueries({ queryKey: ["channels", activeWorkspace.id] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "Could not remove the channel."),
  })

  return (
    <div className="max-w-[900px]">
      <SectionHeader eyebrow="04 · Accounts" title="Connections" aside="Official APIs" />

      {connectors.isLoading && <p className="eyebrow mt-10">Loading…</p>}
      {connectors.isError && <p className="mt-10 text-[14px] text-rust">Could not load the platform list.</p>}

      <div>
        {(connectors.data ?? []).map((c, i) => {
          const count = linkedCount(c.slug)
          return (
            <Reveal key={c.slug} delayMs={Math.min(i, 6) * 70}>
              <HoverRow
                tint={platformTint(c.slug)}
                className="grid grid-cols-1 items-center gap-3 px-2 py-6 sm:grid-cols-[minmax(160px,1fr)_1.3fr_auto] sm:gap-6 sm:px-3"
              >
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ background: platformHue(c.slug) }} />
                  <HoverRow.Title className="display text-[32px] leading-[1.05] group-hover:text-ink">{c.display_name}</HoverRow.Title>
                </div>
                <div>
                  <HoverRow.Desc className="text-[14px] leading-[1.6] text-pretty group-hover:text-ink-55">
                    {connectorSummary(c)}
                  </HoverRow.Desc>
                  {count > 0 && <div className="eyebrow mt-1.5">{count} linked</div>}
                </div>
                <button
                  type="button"
                  onClick={() => setConnecting(c)}
                  className="justify-self-start border border-ink px-5 py-3 text-[10.5px] font-bold tracking-[0.16em] text-ink uppercase transition-colors duration-300 hover:bg-ink hover:text-page sm:justify-self-end"
                >
                  {count > 0 ? "Connect another" : "Connect"}
                </button>
              </HoverRow>
            </Reveal>
          )
        })}
      </div>

      <section className="mt-16">
        <div className="flex items-end justify-between border-b border-hair pb-4">
          <span className="eyebrow text-ink">Linked channels</span>
          <span className="eyebrow">{channels.data?.length ?? 0}</span>
        </div>
        {channels.isSuccess && channels.data.length === 0 && (
          <p className="mt-6 text-[15px] text-ink-55">No accounts linked yet. Pick a platform above to connect one.</p>
        )}
        <ul>
          {(channels.data ?? []).map((ch) => (
            <li key={ch.id} className="border-b border-hair">
              <div className="flex items-center gap-4 py-4">
                <button
                  type="button"
                  onClick={() => navigate(`/app/connections/${ch.id}`)}
                  className="group flex min-w-0 flex-1 items-start gap-4 text-left"
                >
                  <HealthDot health={ch.health} className="mt-[7px]" />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-ink transition-transform duration-300 group-hover:translate-x-1">
                      {ch.display_name}
                    </span>
                    <span className="eyebrow mt-1 block">
                      {connectorBySlug.get(ch.connector_slug)?.display_name ?? ch.connector_slug}
                    </span>
                    {ch.health_detail && <span className="mt-1.5 block text-[13px] text-rust">{ch.health_detail}</span>}
                  </span>
                </button>
                <TextButton type="button" tone="muted" onClick={() => setRemoving(ch)}>
                  Remove
                </TextButton>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {connecting && (
        <ConnectDialog
          key={connecting.slug}
          connector={connecting}
          open
          onOpenChange={(o) => !o && setConnecting(null)}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        eyebrow="Remove"
        title={`Remove ${removing?.display_name ?? "this channel"}?`}
        description="Its credentials, queue slots and recurrence rules are deleted, and so is its delivery history on every post. Anything already published stays up on the platform."
        confirmLabel="Remove"
        tone="rust"
        onConfirm={() => removing && remove.mutate(removing)}
        pending={remove.isPending}
      />
    </div>
  )
}
