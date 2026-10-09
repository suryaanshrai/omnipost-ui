import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useSearchParams } from "react-router"
import { ComposeContext, isPostKind } from "./compose-context"
import ComposeModal from "./ComposeModal"
import type { Post, PostKind } from "@/types/api"

/**
 * Owns the compose modal for the whole shell. Opened from the sidebar's
 * "Compose +", from a draft's Edit, or by landing on any /app URL with
 * `?compose=<kind>` (what the old /app/post-* composer routes redirect to);
 * the param is consumed so a reload doesn't reopen it.
 */
export function ComposeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; session: number; kind?: PostKind; post?: Post }>({
    open: false,
    session: 0,
  })
  const [params, setParams] = useSearchParams()

  const openCompose = useCallback((options?: { kind?: PostKind; post?: Post }) => {
    // A new session key per open remounts the modal, so every open starts clean.
    setState((prev) => ({ open: true, session: prev.session + 1, ...options }))
  }, [])

  const composeParam = params.get("compose")
  useEffect(() => {
    if (composeParam === null) return
    openCompose(isPostKind(composeParam) ? { kind: composeParam } : undefined)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("compose")
        return next
      },
      { replace: true }
    )
  }, [composeParam, openCompose, setParams])

  return (
    <ComposeContext.Provider value={{ openCompose }}>
      {children}
      {state.session > 0 && (
        <ComposeModal
          key={state.session}
          open={state.open}
          onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
          initialKind={state.kind}
          post={state.post}
        />
      )}
    </ComposeContext.Provider>
  )
}
