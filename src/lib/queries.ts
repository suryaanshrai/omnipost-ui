// Shared TanStack Query hooks for data more than one screen reads. Query
// keys are namespaced by workspace id so switching workspace never shows
// another workspace's cached rows.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import type { AppCredential, Billing, Channel, Connector, MediaAsset, Post, UserDetails } from "@/types/api"

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

/** Slugs of the platforms that report engagement metrics (from /connectors/). */
export function useMetricsSlugs(): Set<string> {
  const connectors = useConnectors()
  return new Set((connectors.data ?? []).filter((c) => c.supports_metrics).map((c) => c.slug))
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

/** One MediaAsset by id (Post.base_media is ids only). Dimensions fill in asynchronously after upload. */
export function useMediaAsset(id: number | undefined) {
  return useQuery({
    queryKey: ["media", id],
    queryFn: () => apiFetch<MediaAsset>(`/media/${id}/`),
    enabled: id != null,
    staleTime: 60_000,
  })
}

/** Your hosted plan and usage. `enabled` is false on a self-hosted install. */
export function useBilling() {
  return useQuery({ queryKey: ["billing"], queryFn: () => apiFetch<Billing>("/billing/"), staleTime: 60_000 })
}

/** Removes a channel. Its targets, queue slots and rules go with it, so every list that shows them refreshes. */
export function useRemoveChannel(onRemoved?: (channel: Channel) => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channel: Channel) => apiFetch(`/channels/${channel.id}/`, { method: "DELETE" }),
    onSuccess: (_d, channel) => {
      toast(`${channel.display_name} removed`)
      for (const key of ["channels", "channel", "posts", "calendar", "queue-slots", "recurrence-rules", "billing"]) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      onRemoved?.(channel)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "Could not remove the channel."),
  })
}

export type AppCredentialInput = { client_id: string; client_secret: string; label: string }
export const EMPTY_APP: AppCredentialInput = { client_id: "", client_secret: "", label: "" }

/** The workspace's own OAuth apps (for platforms that need one). */
export function useAppCredentials(enabled = true) {
  const { activeWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ["app-credentials", activeWorkspace.id],
    queryFn: () => apiFetch<Page<AppCredential>>(`/app-credentials/?workspace=${activeWorkspace.id}&limit=200`),
    select: (page) => page.results,
    enabled,
  })
}

/** Registers an OAuth app for a platform; the caller handles errors (they're usually field errors). */
export function useRegisterApp() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, app }: { slug: string; app: AppCredentialInput }) =>
      apiFetch<AppCredential>("/app-credentials/", {
        method: "POST",
        body: {
          workspace: activeWorkspace.id,
          connector_slug: slug,
          client_id: app.client_id.trim(),
          client_secret: app.client_secret.trim(),
          label: app.label.trim(),
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app-credentials", activeWorkspace.id] }),
  })
}
