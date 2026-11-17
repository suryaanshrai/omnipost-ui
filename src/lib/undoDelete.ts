// Deleting with a chance to take it back: the post disappears at once, a
// toast offers Undo, and the DELETE is sent only when the toast runs out.
// Leaving the page first still sends it (keepalive), so nothing reappears.
import { useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch, ApiError } from "@/lib/api"

const UNDO_MS = 6000
const hidden = new Set<number>()
const timers = new Map<number, number>()
const listeners = new Set<() => void>()
let snapshot: ReadonlySet<number> = new Set()

function emit() {
  snapshot = new Set(hidden)
  listeners.forEach((l) => l())
}

function send(id: number, keepalive = false) {
  return apiFetch(`/posts/${id}/`, { method: "DELETE", keepalive })
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    for (const [id, timer] of timers) {
      window.clearTimeout(timer)
      send(id, true).catch(() => {})
    }
    timers.clear()
  })
}

/** Post ids deleted in the last few seconds: hide them from lists. */
export function useHiddenPosts(): ReadonlySet<number> {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot
  )
}

/** Returns `remove(ids, label)`: hides the posts, offers Undo, then deletes them. */
export function useUndoableDelete() {
  const queryClient = useQueryClient()
  return (ids: number[], label: string) => {
    ids.forEach((id) => hidden.add(id))
    emit()
    const finish = (id: number) =>
      send(id)
        .catch((err) => toast.error(err instanceof ApiError ? err.detail : "A post couldn't be deleted."))
        .finally(() => {
          timers.delete(id)
          hidden.delete(id)
          emit()
          void queryClient.invalidateQueries({ queryKey: ["posts"] })
          void queryClient.invalidateQueries({ queryKey: ["calendar"] })
        })
    for (const id of ids) timers.set(id, window.setTimeout(() => void finish(id), UNDO_MS))
    toast(label, {
      duration: UNDO_MS,
      action: {
        label: "Undo",
        onClick: () => {
          for (const id of ids) {
            window.clearTimeout(timers.get(id))
            timers.delete(id)
            hidden.delete(id)
          }
          emit()
        },
      },
    })
  }
}
