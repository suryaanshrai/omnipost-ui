import { useState } from "react"
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query"
import Block from "@/components/app/Block"
import { ChannelChip } from "@/components/app/ChannelChip"
import { kindLabel } from "@/components/compose/compose-context"
import { TextButton } from "@/components/editorial/Buttons"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, type Page } from "@/lib/api"
import { METRICS_CONNECTORS } from "@/lib/connectors"
import { formatStamp, WEEKDAYS } from "@/lib/format"
import { useChannelMap } from "@/lib/queries"
import { useSectionEyebrow } from "@/lib/nav"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { BestTime, Channel, Post, PostMetric, PostPerformanceEntry, PostTarget } from "@/types/api"

const PAGE = 20

function n(v: number | null | undefined): string {
  return v == null ? "—" : v.toLocaleString("en-US")
}

export default function Analytics() {
  const eyebrow = useSectionEyebrow("/app/analytics", "Performance")
  const { activeWorkspace } = useWorkspace()
  const { map: channels } = useChannelMap()
  const measurable = [...channels.values()].filter((c) => METRICS_CONNECTORS.has(c.connector_slug))

  const posts = useInfiniteQuery({
    queryKey: ["posts", activeWorkspace.id, "analytics"],
    queryFn: ({ pageParam }) =>
      apiFetch<Page<Post>>(`/posts/?workspace=${activeWorkspace.id}&status=published&limit=${PAGE}&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * PAGE : undefined),
  })
  const list = posts.data?.pages.flatMap((p) => p.results) ?? []

  // Only ask for numbers where they can exist: a post with at least one
  // published target on a connector that reports metrics.
  const hasMeasurable = (p: Post) =>
    p.targets.some((t) => t.status === "published" && METRICS_CONNECTORS.has(channels.get(t.channel)?.connector_slug ?? ""))
  const performance = useQueries({
    queries: list.map((p) => ({
      queryKey: ["performance", p.id],
      queryFn: () => apiFetch<PostPerformanceEntry[]>(`/posts/${p.id}/performance/`),
      enabled: hasMeasurable(p),
      staleTime: 5 * 60_000,
    })),
  })

  const totals = performance.reduce(
    (acc, q) => {
      for (const e of q.data ?? []) {
        acc.likes += e.metric.likes ?? 0
        acc.comments += e.metric.comments ?? 0
        acc.shares += e.metric.shares ?? 0
        acc.impressions += e.metric.impressions ?? 0
      }
      return acc
    },
    { likes: 0, comments: 0, shares: 0, impressions: 0 }
  )

  return (
    <div className="max-w-[860px]">
      <SectionHeader eyebrow={eyebrow} title="Analytics" aside={`${posts.data?.pages[0]?.count ?? 0} published`} />

      <p className="mt-6 max-w-[620px] border-l-2 border-rust pl-4 text-[14px] leading-[1.6] text-ink-55">
        Engagement numbers currently come from <span className="text-ink">Bluesky</span> and{" "}
        <span className="text-ink">Mastodon</span> only. The other platforms don't report them to OmniPost yet, so their
        posts show delivery but no numbers. Nothing here is estimated.
      </p>

      {measurable.length > 0 && (
        <dl className="mt-10 grid grid-cols-2 border-t border-l border-hair sm:grid-cols-4">
          {(
            [
              ["Likes", totals.likes],
              ["Replies", totals.comments],
              ["Reposts", totals.shares],
              ["Impressions", totals.impressions],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="border-r border-b border-hair px-5 py-5">
              <dt className="eyebrow">{label}</dt>
              <dd className="display mt-2 text-[40px] leading-none">{value.toLocaleString("en-US")}</dd>
            </div>
          ))}
        </dl>
      )}
      {measurable.length > 0 && <p className="mt-2 text-[12px] text-ink-45">Latest snapshot per post, across the posts loaded below.</p>}

      <Block title="Posts">
        {posts.isLoading && <p className="eyebrow">Loading…</p>}
        {posts.isSuccess && list.length === 0 && <p className="text-[15px] text-ink-55">Nothing published yet.</p>}
        <ul className="-mt-6">
          {list.map((p, i) => (
            <PostRow key={p.id} post={p} channels={channels} entries={performance[i]?.data} measurable={hasMeasurable(p)} />
          ))}
        </ul>
        {posts.hasNextPage && (
          <TextButton type="button" className="mt-6" onClick={() => posts.fetchNextPage()} disabled={posts.isFetchingNextPage}>
            Older posts
          </TextButton>
        )}
      </Block>

      <Block title="Best times, by channel">
        {measurable.length === 0 ? (
          <p className="text-[14px] text-ink-55">
            Best-time suggestions need engagement history, so they appear once a Bluesky or Mastodon channel has at least
            five published posts.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2">
            {measurable.map((c) => (
              <BestTimes key={c.id} channel={c} />
            ))}
          </div>
        )}
      </Block>
    </div>
  )
}

function PostRow({
  post,
  channels,
  entries,
  measurable,
}: {
  post: Post
  channels: Map<number, Channel>
  entries: PostPerformanceEntry[] | undefined
  measurable: boolean
}) {
  const [open, setOpen] = useState<number | null>(null)
  const byTarget = new Map((entries ?? []).map((e) => [e.post_target, e]))
  const published = post.targets.filter((t) => t.status === "published")

  return (
    <li className="border-b border-hair py-6">
      <div className="flex flex-wrap items-center gap-x-3">
        <span className="eyebrow text-rust">{kindLabel(post.kind)}</span>
        <span className="eyebrow">{formatStamp(published[0]?.published_at ?? post.updated_at)}</span>
      </div>
      <p className="mt-2 line-clamp-2 max-w-[640px] text-[15px] leading-[1.55]">{post.base_text || "—"}</p>
      <div className="mt-4 grid gap-2">
        {published.map((t) => {
          const ch = channels.get(t.channel)
          const entry = byTarget.get(t.id)
          const supported = METRICS_CONNECTORS.has(ch?.connector_slug ?? "")
          return (
            <div key={t.id}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <ChannelChip channel={ch} />
                {entry ? (
                  <>
                    <Metric label="Likes" value={entry.metric.likes} />
                    <Metric label="Replies" value={entry.metric.comments} />
                    <Metric label="Reposts" value={entry.metric.shares} />
                    {entry.metric.impressions != null && <Metric label="Views" value={entry.metric.impressions} />}
                    <TextButton type="button" tone="muted" onClick={() => setOpen(open === t.id ? null : t.id)}>
                      {open === t.id ? "Hide history" : "History"}
                    </TextButton>
                  </>
                ) : (
                  <span className="text-[12.5px] text-ink-45">
                    {supported ? (measurable ? "No snapshot yet — numbers arrive after the next poll." : "") : "This platform doesn't report numbers."}
                  </span>
                )}
                {t.permalink && (
                  <a href={t.permalink} target="_blank" rel="noreferrer" className="text-[12px] text-ink-55 underline underline-offset-4 hover:text-rust">
                    View ↗
                  </a>
                )}
              </div>
              {open === t.id && <History target={t} />}
            </div>
          )
        })}
      </div>
    </li>
  )
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-display text-[20px] leading-none">{n(value)}</span>
      <span className="eyebrow">{label}</span>
    </span>
  )
}

function History({ target }: { target: PostTarget }) {
  const history = useQuery({
    queryKey: ["target-performance", target.id],
    queryFn: () => apiFetch<PostMetric[]>(`/post-targets/${target.id}/performance/`),
  })
  const rows = history.data ?? []
  return (
    <div className="mt-3 border-l border-hair pl-5">
      {history.isLoading && <p className="eyebrow">Loading…</p>}
      {rows.length > 0 && (
        <table className="w-full max-w-[520px] text-left text-[12.5px]">
          <thead>
            <tr className="eyebrow">
              <th className="py-1.5 font-bold">Fetched</th>
              <th className="py-1.5 font-bold">Likes</th>
              <th className="py-1.5 font-bold">Replies</th>
              <th className="py-1.5 font-bold">Reposts</th>
              <th className="py-1.5 font-bold">Views</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-hair">
                <td className="py-1.5 text-ink-55">{formatStamp(m.fetched_at)}</td>
                <td>{n(m.likes)}</td>
                <td>{n(m.comments)}</td>
                <td>{n(m.shares)}</td>
                <td>{n(m.impressions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function BestTimes({ channel }: { channel: Channel }) {
  const best = useQuery({
    queryKey: ["best-times", channel.id],
    queryFn: () => apiFetch<BestTime[]>(`/channels/${channel.id}/best-times/`),
  })
  const rows = (best.data ?? []).slice(0, 5)
  const top = rows.reduce((m, r) => Math.max(m, r.avg_engagement), 0)
  return (
    <div>
      <ChannelChip channel={channel} />
      {best.isSuccess && rows.length === 0 && (
        <p className="mt-3 text-[13px] text-ink-55">Not enough history yet (five published posts with numbers).</p>
      )}
      <ul className="mt-3">
        {rows.map((r) => (
          <li key={`${r.weekday}-${r.hour}`} className="grid grid-cols-[90px_1fr] items-center gap-3 py-1.5 text-[13px]">
            <span className="font-semibold">
              {WEEKDAYS[r.weekday]} {String(r.hour).padStart(2, "0")}:00
            </span>
            <span className="flex items-center gap-2">
              <span className={cn("h-[3px] bg-rust")} style={{ width: `${top ? (r.avg_engagement / top) * 100 : 0}%` }} />
              <span className="eyebrow shrink-0">{r.avg_engagement.toFixed(1)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
