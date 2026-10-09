import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"

/**
 * A single shared cache, mounted once at the root (see main.tsx). Query
 * keys are established per-domain as each phase wires up its own screens
 * (e.g. Phase D's `['posts', workspaceId]`) — nothing here is domain-
 * specific on purpose.
 *
 * Doesn't retry 4xx ApiErrors: a validation failure or a 404 won't turn
 * into a 401 by trying again, so retrying it is just a slower failure.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
  },
})
