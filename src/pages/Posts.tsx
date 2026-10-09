import { useState } from "react"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChannelChip } from "@/components/app/ChannelChip"
import MediaBand from "@/components/app/MediaBand"
import { kindLabel } from "@/components/compose/compose-context"
import { OutlineButton, TextButton } from "@/components/editorial/Buttons"
import Reveal from "@/components/editorial/Reveal"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { isDue } from "@/lib/posts"
import { useChannelMap, usePostCount } from "@/lib/queries"
import { useSectionEyebrow } from "@/lib/nav"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Channel, Post, PostTarget, PublishAttempt } from "@/types/api"

const PAGE = 20
const IN_FLIGHT = new Set(["pending", "scheduled", "publishing"])

/** The moment a post "happened": its first publish, else when it was meant to go, else its last change. */
function postStamp(post: Post): string {
  const published = post.targets
    .map((t) => t.published_at)
    .filter((d): d is string => !!d)
    .sort()[0]
  return formatStamp(published ?? post.scheduled_for ?? post.updated_at)
}

export default function Posts() {
  const eyebrow = useSectionEyebrow("/app", "Published")
  const { activeWorkspace } = useWorkspace()
  const { map: channels } = useChannelMap()

  const query = useInfiniteQuery({
    queryKey: ["posts", activeWorkspace.id, "published"],
    queryFn: ({ pageParam }) =>
      apiFetch<Page<Post>>(
        `/posts/?workspace=${activeWorkspace.id}&status=published,publishing,failed,scheduled&limit=${PAGE}&offset=${pageParam}`
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * PAGE : undefined),
    // Poll while anything is still on its way out, so a dispatch resolves on screen without a reload.
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) =>
        p.results.some(
          (post) => (post.status !== "scheduled" || isDue(post)) && post.targets.some((t) => IN_FLIGHT.has(t.status))
        )
      )
        ? 4000
        : false,
  })

  // A scheduled post shows here once its hour has come (it's being
  // dispatched); until then it waits in Drafts/Calendar.
  const posts = query.data?.pages.flatMap((p) => p.results).filter((p) => p.status !== "scheduled" || isDue(p)) ?? []
  const published = usePostCount("published")

  return (
    <div className="max-w-[760px]">
      <SectionHeader eyebrow={eyebrow} title="Your posts" aside={`${published.data ?? 0} published`} />

      {query.isLoading && <p className="eyebrow mt-10">Loading…</p>}
      {query.isError && (
        <p className="mt-10 text-[14px] text-rust">
          {query.error instanceof ApiError ? query.error.detail : "Could not load your posts."}
        </p>
      )}
      {query.isSuccess && posts.length === 0 && (
        <p className="mt-10 text-[15px] text-ink-55">Nothing dispatched yet. Dispatch a draft and it lands here.</p>
      )}

      <div>
        {posts.map((post, i) => (
          <Reveal key={post.id} delayMs={Math.min(i, 6) * 70}>
            <PostEntry post={post} channels={channels} />
          </Reveal>
        ))}
      </div>

      {query.hasNextPage && (
        <div className="mt-10">
          <TextButton type="button" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? "Loading…" : "Older posts"}
          </TextButton>
        </div>
      )}
    </div>
  )
}

function PostEntry({ post, channels }: { post: Post; channels: Map<number, Channel> }) {
  const [open, setOpen] = useState(false)
  const anyFailed = post.targets.some((t) => t.status === "failed")

  return (
    <article className="border-b border-hair py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="eyebrow text-rust">{kindLabel(post.kind)}</span>
          <span className="eyebrow">{postStamp(post)}</span>
          {(post.status === "publishing" || post.status === "scheduled") && (
            <span className="eyebrow text-ink">· Dispatching</span>
          )}
        </div>
        <OutlineButton type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          Delivery
          {anyFailed && <span aria-label="A channel failed" className="h-[6px] w-[6px] rounded-full bg-rust" />}
        </OutlineButton>
      </div>

      {!!post.base_media?.length && <MediaBand mediaId={post.base_media[0]} className="mt-6" />}

      {post.base_text && (
        <p className="mt-5 max-w-[600px] text-[17px] leading-[1.6] text-pretty whitespace-pre-line text-ink">
          {post.base_text}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {post.targets.map((t) => (
          <ChannelChip key={t.id} channel={channels.get(t.channel)} status={t.status} />
        ))}
      </div>

      {open && <DeliveryLog post={post} channels={channels} />}
    </article>
  )
}

function DeliveryLog({ post, channels }: { post: Post; channels: Map<number, Channel> }) {
  const queryClient = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const inFlight = post.targets.some((t) => IN_FLIGHT.has(t.status))

  const attempts = useQuery({
    queryKey: ["publish-attempts", post.id],
    queryFn: () => apiFetch<Page<PublishAttempt>>(`/publish-attempts/?post=${post.id}&limit=100`),
    select: (page) => page.results,
    refetchInterval: inFlight ? 4000 : false,
  })

  const retry = useMutation({
    mutationFn: (target: PostTarget) =>
      apiFetch(`/posts/${post.id}/retry-target/${target.id}/`, { method: "POST" }),
    onSuccess: () => {
      toast("Retry queued")
      queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
      queryClient.invalidateQueries({ queryKey: ["publish-attempts", post.id] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "Could not retry."),
  })

  const targetById = new Map(post.targets.map((t) => [t.id, t]))

  return (
    <div className="mt-6 border-l border-hair pl-5">
      <div className="eyebrow mb-4">Delivery log</div>
      {attempts.isLoading && <p className="text-[13px] text-ink-45">Loading…</p>}
      {attempts.isSuccess && attempts.data.length === 0 && (
        <p className="text-[13px] text-ink-45">No attempts recorded yet.</p>
      )}
      <ul className="space-y-3">
        {attempts.data?.map((a) => {
          const target = targetById.get(a.post_target)
          const channel = target ? channels.get(target.channel) : undefined
          const failed = a.status === "failed"
          const ok = a.status === "succeeded"
          return (
            <li key={a.id} className="grid grid-cols-[18px_1fr] gap-x-2 text-[13px] leading-[1.55]">
              <span aria-hidden="true" className={cn(failed ? "text-rust" : "text-ink-38")}>
                {failed ? "✕" : ok ? "✓" : "·"}
              </span>
              <div>
                <span className="font-semibold text-ink">{channel?.display_name ?? "Channel"}</span>
                <span className="text-ink-45"> · attempt {a.attempt_number} · </span>
                <span className={cn(failed ? "text-rust" : "text-ink-55")}>{a.status}</span>
                <span className="text-ink-38"> · {formatStamp(a.finished_at ?? a.started_at ?? a.run_at)}</span>
                {a.error_detail && <p className="mt-0.5 text-ink-55">{a.error_detail}</p>}
              </div>
            </li>
          )
        })}
      </ul>

      {post.targets.some((t) => t.status === "failed" || t.status === "published") && (
        <ul className="mt-6 space-y-2 border-t border-hair pt-4">
          {post.targets.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 text-[13px]">
              <ChannelChip channel={channels.get(t.channel)} status={t.status} />
              {t.status === "failed" && (
                <TextButton type="button" tone="rust" onClick={() => retry.mutate(t)} disabled={retry.isPending}>
                  Retry
                </TextButton>
              )}
              {t.permalink && (
                <a href={t.permalink} target="_blank" rel="noreferrer" className="text-[12px] text-ink-55 underline underline-offset-4 hover:text-rust">
                  View on platform ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
