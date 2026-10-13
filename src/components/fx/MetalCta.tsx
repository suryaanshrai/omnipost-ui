import { lazy, Suspense } from "react"
import type { ReactElement } from "react"

const Impl = lazy(() => import("./MetalCtaImpl"))

/**
 * The one liquid-metal moment in the product: the landing hero's primary
 * CTA. metal-fx (WebGL2) loads lazily; until then — and on browsers without
 * WebGL2 — the plain button renders.
 */
export default function MetalCta({ children, theme }: { children: ReactElement; theme?: "light" | "dark" }) {
  return (
    <Suspense fallback={children}>
      <Impl theme={theme}>{children}</Impl>
    </Suspense>
  )
}
