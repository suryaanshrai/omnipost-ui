import { MutationCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"

/** A hosted plan's limit (402): say so once, with the way out. */
export function isPlanLimit(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 402
}

export function showPlanLimit(error: ApiError) {
  toast.error(error.detail, {
    id: "plan-limit",
    action: { label: "See plans", onClick: () => window.location.assign("/app/settings?tab=account") },
  })
}

/**
 * A single shared cache, mounted once at the root (see main.tsx). Query
 * keys are established per-domain as each phase wires up its own screens
 * (e.g. Phase D's `['posts', workspaceId]`) — nothing here is domain-
 * specific on purpose.
 *
 * Doesn't retry 4xx ApiErrors: a validation failure or a 404 won't turn
 * into a 401 by trying again, so retrying it is just a slower failure.
 *
 * A mutation with no onError of its own still tells the user it failed,
 * instead of a toggle or delete silently doing nothing. Any mutation that
 * hits a plan limit gets the "See plans" toast, whatever its own onError does.
 */
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isPlanLimit(error)) showPlanLimit(error)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: {
      onError: (error) => {
        if (isPlanLimit(error)) return
        toast.error(error instanceof ApiError ? error.detail : "That didn't work. Try again in a moment.")
      },
    },
  },
})
