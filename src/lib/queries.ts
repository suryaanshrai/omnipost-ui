// Shared TanStack Query hooks for data more than one screen reads. Query
// keys are namespaced by workspace id so switching workspace never shows
// another workspace's cached rows.
import { useQuery } from "@tanstack/react-query"
import { apiFetch, type Page } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import type { Channel, Connector, Post, UserDetails } from "@/types/api"

/** Count of posts in the active workspace with a given status — the nav badges. */
export function usePostCount(status: string, enabled = true) {
  const { activeWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ["posts", activeWorkspace.id, "count", status],
    queryFn: () => apiFetch<Page<Post>>(`/posts/?workspace=${activeWorkspace.id}&status=${status}&limit=1`),
    select: (page) => page.count,
    enabled,
  })
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => apiFetch<UserDetails>("/auth/user/"), staleTime: 5 * 60_000 })
}

/** Every connector the backend registers (a plain array, not paginated). Effectively static. */
export function useConnectors() {
  return useQuery({
    queryKey: ["connectors"],
    queryFn: () => apiFetch<Connector[]>("/connectors/"),
    staleTime: Infinity,
  })
}

/** The active workspace's linked channels. */
export function useChannels() {
  const { activeWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ["channels", activeWorkspace.id],
    queryFn: () => apiFetch<Page<Channel>>(`/channels/?workspace=${activeWorkspace.id}&limit=200`),
    // The filter is server-side too; this guards against a cached page from
    // before a workspace switch ever leaking through.
    select: (page) => page.results.filter((c) => c.workspace === activeWorkspace.id),
  })
}

/** id → Channel lookup for joining PostTarget.channel to a display name. */
export function useChannelMap() {
  const channels = useChannels()
  const map = new Map<number, Channel>()
  for (const c of channels.data ?? []) map.set(c.id, c)
  return { ...channels, map }
}
