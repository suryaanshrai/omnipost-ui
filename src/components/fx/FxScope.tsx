import type { ReactNode } from "react"
import { FxScopeContext, type FxTheme } from "@/lib/fx"

/** Pins every effect below it to one theme — the Day-only landing page and its dark bands. */
export default function FxScope({ theme, children }: { theme: FxTheme; children: ReactNode }) {
  return <FxScopeContext.Provider value={theme}>{children}</FxScopeContext.Provider>
}
