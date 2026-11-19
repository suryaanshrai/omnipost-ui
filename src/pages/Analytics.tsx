import { useState } from "react"
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query"
import Block from "@/components/app/Block"
import { ChannelChip } from "@/components/app/ChannelChip"
import RepostButton from "@/components/app/RepostButton"
import { kindLabel } from "@/components/compose/compose-context"
import { TextButton } from "@/components/editorial/Buttons"
import SectionHeader from "@/components/editorial/SectionHeader"
import { apiFetch, type Page } from "@/lib/api"
import { WEEKDAYS, formatNumber, formatStamp } from "@/lib/format"
import { useChannelMap, useConnectors, useMetricsSlugs } from "@/lib/queries"
import { useSectionEyebrow } from "@/lib/nav"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { BestTime, Channel, Post, PostMetric, PostPerformanceEntry, PostTarget } from "@/types/api"
import ListSkeleton from "@/components/app/ListSkeleton"
import { safeHref } from "@/lib/url"
import Stamp from "@/components/editorial/Stamp"

const PAGE = 20

function n(v: number | null | undefined): string {
  return v == null ? "—" : formatNumber(v)
}

export default function Analytics() {
  const eyebrow = useSectionEyebrow("/app/analytics", "Performance")
  const { activeWorkspace } = useWorkspace()
  const { map: channels } = useChannelMap()
  const metricsSlugs = useMetricsSlugs()
  const connectors = useConnectors()
  const measurable = [...channels.values()].filter((c) => metricsSlugs.has(c.connector_slug))

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
    p.targets.some((t) => t.status === "published" && metricsSlugs.has(channels.get(t.channel)?.connector_slug ?? ""))
  // One request per loaded page of posts, not one per post.
  const batches = useQueries({
    queries: (posts.data?.pages ?? []).map((page) => {
      const ids = page.results.filter(hasMeasurable).map((p) => p.id)
      return {
        queryKey: ["performance-batch", activeWorkspace.id, ids.join(",")],
        queryFn: () =>
          apiFetch<{ results: Record<string, PostPerformanceEntry[]> }>(
            `/posts/performance/?workspace=${activeWorkspace.id}&ids=${ids.join(",")}`
          ),
        enabled: ids.length > 0,
        staleTime: 5 * 60_000,
      }
    }),
  })
  const entriesFor = new Map<number, PostPerformanceEntry[]>()
  for (const batch of batches) {
    for (const [id, entries] of Object.entries(batch.data?.results ?? {})) entriesFor.set(Number(id), entries)
  }

  const engagement = (id: number) =>
    (entriesFor.get(id) ?? []).reduce((sum, e) => sum + (e.metric.likes ?? 0) + (e.metric.comments ?? 0) + (e.metric.shares ?? 0), 0)
  const top = list
    .filter((p) => engagement(p.id) > 0)
    .sort((a, b) => engagement(b.id) - engagement(a.id))
    .slice(0, 3)

  const totals = [...entriesFor.values()].flat().reduce(
    (acc, e) => {
      acc.likes += e.metric.likes ?? 0
      acc.comments += e.metric.comments ?? 0
      acc.shares += e.metric.shares ?? 0
      acc.impressions += e.metric.impressions ?? 0
      return acc
    },
    { likes: 0, comments: 0, shares: 0, impressions: 0 }
  )
  const reporting = (connectors.data ?? []).filter((c) => c.supports_metrics).map((c) => c.display_name)

  return (
    <div className="@container max-w-[860px]">
      <SectionHeader eyebrow={eyebrow} title="Analytics" aside={`${posts.data?.pages[0]?.count ?? "—"} published`} />

      <p className="mt-6 max-w-[620px] border-l-2 border-rust pl-4 text-[14px] leading-[1.6] text-ink-55">
        Numbers come straight from {reporting.length ? <span className="text-ink">{reporting.join(", ")}</span> : "the platforms"}
        , refreshed a few times after each post. Some platforms only report them once your app has the analytics
        permission; until then their posts show delivery but no numbers. Nothing here is estimated.
      </p>

      {measurable.length > 0 && (
        <dl className="mt-10 grid grid-cols-2 border-t border-l border-hair @xl:grid-cols-4">
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
              <dd className="display mt-2 text-[40px] leading-none">{formatNumber(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {measurable.length > 0 && <p className="mt-2 text-[12px] text-ink-45">Latest snapshot per post, across the posts loaded below.</p>}

      {top.length > 0 && (
        <Block title="Top posts" aside="Likes + replies + reposts">
          <ol className="-mt-2">
            {top.map((p, i) => (
              <li key={p.id} className="grid grid-cols-[32px_1fr_auto] items-baseline gap-4 border-b border-hair py-4">
                <span className="display text-[24px] leading-none text-rust">{i + 1}</span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-[15px] leading-[1.5]">{p.base_text || "—"}</span>
                  <span className="eyebrow mt-1 block">{formatNumber(engagement(p.id))} interactions</span>
                </span>
                <RepostButton post={p} />
              </li>
            ))}
          </ol>
        </Block>
      )}

      <Block title="Posts">
        {posts.isLoading && <ListSkeleton />}
        {posts.isSuccess && list.length === 0 && <p className="text-[15px] text-ink-55">Nothing published yet.</p>}
        <ul className="-mt-6">
          {list.map((p) => (
            <PostRow key={p.id} post={p} channels={channels} entries={entriesFor.get(p.id)} measurable={hasMeasurable(p)} />
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
            Best-time suggestions need engagement history, so they appear once a channel that reports numbers has at
            least five published posts.
          </p>
        ) : (
          <div className="grid gap-8 @lg:grid-cols-2">
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
  const metricsSlugs = useMetricsSlugs()
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
          const supported = metricsSlugs.has(ch?.connector_slug ?? "")
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
                {safeHref(t.permalink) && (
                  <a href={safeHref(t.permalink)!} target="_blank" rel="noreferrer" className="text-[12px] text-ink-55 underline underline-offset-4 hover:text-rust">
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
        // Scrolls sideways on its own on a narrow screen instead of widening
        // the page; focusable so the keyboard can scroll it too (a named
        // region, which is what jsx-a11y's rule can't see).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        <div role="region" aria-labelledby={`history-${target.id}`} tabIndex={0} className="max-w-[520px] overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[12.5px]">
            <caption id={`history-${target.id}`} className="sr-only">
              Numbers over time
            </caption>
            <thead>
              <tr className="eyebrow">
                <th scope="col" className="py-1.5 font-bold">Fetched</th>
                <th scope="col" className="py-1.5 font-bold">Likes</th>
                <th scope="col" className="py-1.5 font-bold">Replies</th>
                <th scope="col" className="py-1.5 font-bold">Reposts</th>
                <th scope="col" className="py-1.5 font-bold">Views</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-hair">
                <th scope="row" className="py-1.5 text-left font-normal text-ink-55">
                  <Stamp iso={m.fetched_at} />
                </th>
                <td>{n(m.likes)}</td>
                <td>{n(m.comments)}</td>
                <td>{n(m.shares)}</td>
                <td>{n(m.impressions)}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
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
