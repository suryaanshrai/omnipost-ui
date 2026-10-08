import { useEffect, useRef } from "react"

/**
 * The custom cursor from Landing Page v2.dc.html: a 30px difference-blend
 * ring plus a 5px dot, both following the pointer; the ring scales to ~2.1×
 * over interactive elements. Landing-page only, per the "custom cursor"
 * decision — inside the app it would fight text selection and form
 * interaction, so this component is never mounted there.
 *
 * Guards on both `(pointer: fine)` (touch devices keep their own cursor —
 * the source does this in CSS with `@media (pointer: fine) { cursor: none }`,
 * mirrored here so the ring itself doesn't render when it wouldn't apply)
 * and `prefers-reduced-motion` (a cursor trailing the pointer is exactly the
 * kind of motion that setting exists to suppress).
 */
export default function CursorRing() {
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!finePointer || reducedMotion) return

    const onMove = (e: MouseEvent) => {
      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`
        dotRef.current.style.top = `${e.clientY}px`
      }
      if (ringRef.current) {
        ringRef.current.style.left = `${e.clientX}px`
        ringRef.current.style.top = `${e.clientY}px`
      }
    }
    const isInteractive = (target: EventTarget | null) =>
      target instanceof Element && target.closest("a,button,input,textarea,[data-tint]")
    const onOver = (e: MouseEvent) => {
      if (ringRef.current && isInteractive(e.target)) ringRef.current.style.transform = "scale(2.1)"
    }
    const onOut = (e: MouseEvent) => {
      if (ringRef.current && isInteractive(e.target)) ringRef.current.style.transform = "scale(1)"
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseover", onOver)
    document.addEventListener("mouseout", onOut)
    document.documentElement.classList.add("cursor-none")
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseover", onOver)
      document.removeEventListener("mouseout", onOut)
      document.documentElement.classList.remove("cursor-none")
    }
  }, [])

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[500] -ml-[15px] -mt-[15px] h-[30px] w-[30px] rounded-full border border-page transition-[transform] duration-300 ease-[cubic-bezier(.16,1,.3,1)]"
        style={{ mixBlendMode: "difference" }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[500] -ml-[2.5px] -mt-[2.5px] h-[5px] w-[5px] rounded-full bg-page"
        style={{ mixBlendMode: "difference" }}
      />
    </>
  )
}
