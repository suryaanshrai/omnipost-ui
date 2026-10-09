import { Navigate } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChannelChip } from "@/components/app/ChannelChip"
import MediaBand from "@/components/app/MediaBand"
import { kindLabel } from "@/components/compose/compose-context"
import { PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import Reveal from "@/components/editorial/Reveal"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { useChannelMap } from "@/lib/queries"
import { useSectionEyebrow } from "@/lib/nav"
import { useWorkspace } from "@/lib/workspace"
import type { Channel, Post } from "@/types/api"

/**
 * Posts waiting on a reviewer. Only reachable while the workspace has the
 * approval workflow on — with it on, schedule/queue require an approved
 * (or failed) post, so this is the gate between Drafts and dispatch.
 */
export default function Approvals() {
  const eyebrow = useSectionEyebrow("/app/approvals", "Review")
  const { activeWorkspace } = useWorkspace()
  const { map: channels } = useChannelMap()
  const inReview = useQuery({
    queryKey: ["posts", activeWorkspace.id, "in_review"],
    queryFn: () => apiFetch<Page<Post>>(`/posts/?workspace=${activeWorkspace.id}&status=in_review&limit=100`),
    select: (page) => page.results,
    enabled: !!activeWorkspace.approval_workflow_enabled,
  })

  if (!activeWorkspace.approval_workflow_enabled) return <Navigate to="/app/drafts" replace />
  const list = inReview.data ?? []

  return (
    <div className="max-w-[760px]">
      <SectionHeader eyebrow={eyebrow} title="Approvals" aside={`${list.length} in review`} />
      {inReview.isLoading && <p className="eyebrow mt-10">Loading…</p>}
      {inReview.isSuccess && list.length === 0 && (
        <p className="mt-10 text-[15px] text-ink-55">Nothing to review. Drafts submitted for review wait here.</p>
      )}
      {list.map((post, i) => (
        <Reveal key={post.id} delayMs={Math.min(i, 6) * 70}>
          <ReviewEntry post={post} channels={channels} />
        </Reveal>
      ))}
    </div>
  )
}

function ReviewEntry({ post, channels }: { post: Post; channels: Map<number, Channel> }) {
  const queryClient = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const decide = useMutation({
    mutationFn: (decision: "approve" | "request-changes") =>
      apiFetch<Post>(`/posts/${post.id}/${decision}/`, { method: "POST" }),
    onSuccess: (_d, decision) => {
      toast(decision === "approve" ? "Approved — ready to dispatch from Drafts" : "Sent back to drafts")
      queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "That didn't go through."),
  })

  return (
    <article className="border-b border-hair py-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="eyebrow text-rust">{kindLabel(post.kind)}</span>
        <span className="eyebrow">Submitted {formatStamp(post.updated_at)}</span>
        {post.scheduled_for && <span className="eyebrow">· for {formatStamp(post.scheduled_for)}</span>}
      </div>
      {!!post.base_media?.length && <MediaBand mediaId={post.base_media[0]} className="mt-6" />}
      <p className="mt-5 max-w-[600px] text-[17px] leading-[1.6] text-pretty whitespace-pre-line text-ink">
        {post.base_text || <span className="text-ink-45 italic">No caption.</span>}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {post.targets.map((t) => (
          <ChannelChip key={t.id} channel={channels.get(t.channel)} />
        ))}
      </div>
      {post.targets.some((t) => t.text_override) && (
        <ul className="mt-5 space-y-3 border-l border-hair pl-5">
          {post.targets
            .filter((t) => t.text_override)
            .map((t) => (
              <li key={t.id} className="text-[14px] leading-[1.6]">
                <span className="eyebrow block">{channels.get(t.channel)?.display_name ?? "Channel"} version</span>
                <span className="whitespace-pre-line text-ink-55">{t.text_override}</span>
              </li>
            ))}
        </ul>
      )}
      <div className="mt-7 flex flex-wrap items-center gap-6">
        <PrimaryButton type="button" onClick={() => decide.mutate("approve")} disabled={decide.isPending}>
          Approve
        </PrimaryButton>
        <TextButton type="button" onClick={() => decide.mutate("request-changes")} disabled={decide.isPending}>
          Request changes
        </TextButton>
      </div>
    </article>
  )
}
