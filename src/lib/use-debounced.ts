import { useEffect, useState } from "react"

/**
 * `value`, settled: updates `delayMs` after the last change. Compared by
 * JSON so an object rebuilt every render with the same contents doesn't
 * keep resetting the timer.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value)
  const key = JSON.stringify(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(JSON.parse(key) as T), delayMs)
    return () => window.clearTimeout(timer)
  }, [key, delayMs])
  return settled
}
