import { useCallback, useState } from "react"
import type { ReactNode } from "react"
import { ComposeContext } from "./compose-context"
import type { Post, PostKind } from "@/types/api"

/** Holds the compose modal's open state for the whole shell. The modal itself mounts here (Phase E). */
export function ComposeProvider({ children }: { children: ReactNode }) {
  const [, setState] = useState<{ open: boolean; kind?: PostKind; post?: Post }>({ open: false })
  const openCompose = useCallback((options?: { kind?: PostKind; post?: Post }) => {
    setState({ open: true, ...options })
  }, [])

  return <ComposeContext.Provider value={{ openCompose }}>{children}</ComposeContext.Provider>
}
