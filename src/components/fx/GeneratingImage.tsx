import { forwardRef, lazy, Suspense, useImperativeHandle, useRef, useState } from "react"
import { isSoftwareGL } from "@/lib/fx"
import { cn } from "@/lib/utils"
import Orb from "./Orb"
import type { GeneratingImageHandle, GeneratingImageProps } from "./GeneratingImageImpl"

export type { GeneratingImageHandle, GeneratingImageProps }

// img-fx brings three.js — load it only when an image is actually generating
// or revealing, never in the main chunk.
const Impl = lazy(() => import("./GeneratingImageImpl"))

/**
 * img-fx's "generating" mosaic in the paper palette (see GeneratingImageImpl).
 * Where WebGL is missing or software-rendered it would stall the page, so
 * there the generating state is a quiet orb and the image simply appears.
 */
const GeneratingImage = forwardRef<GeneratingImageHandle, GeneratingImageProps>(function GeneratingImage(props, ref) {
  const [soft] = useState(isSoftwareGL)
  const [revealed, setRevealed] = useState<string | undefined>(undefined)
  const inner = useRef<GeneratingImageHandle>(null)
  useImperativeHandle(
    ref,
    () => ({
      reveal: (src) => (soft ? setRevealed(src) : inner.current?.reveal(src)),
      hide: () => (soft ? setRevealed(undefined) : inner.current?.hide()),
    }),
    [soft]
  )

  if (soft) {
    const src = revealed ?? props.src
    return src ? (
      <img src={src} alt="" className={cn("block object-cover", props.className)} style={props.style} />
    ) : (
      <div className={cn("flex items-center justify-center bg-page", props.className)} style={props.style}>
        <Orb state="shaping" size={32} />
      </div>
    )
  }
  return (
    <Suspense fallback={<div className={props.className} style={{ ...props.style, background: "var(--page)", display: "block" }} />}>
      <Impl ref={inner} {...props} />
    </Suspense>
  )
})

export default GeneratingImage
