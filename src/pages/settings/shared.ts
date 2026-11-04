import { useQuery } from "@tanstack/react-query"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"

/** A per-workspace list endpoint, keyed so a workspace switch never shows the previous one's rows. */
export function useWorkspaceList<T>(resource: string) {
  const { activeWorkspace } = useWorkspace()
  return useQuery({
    queryKey: [resource, activeWorkspace.id],
    queryFn: () => apiFetch<Page<T>>(`/${resource}/?workspace=${activeWorkspace.id}&limit=200`),
    select: (page) => page.results,
  })
}

export function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.detail : fallback
}
