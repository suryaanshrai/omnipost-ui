import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }))
vi.mock("sonner", () => ({ toast: toastMock }))

import { useHiddenPosts, useUndoableDelete } from "@/lib/undoDelete"

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

describe("undoable delete", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toastMock.mockClear()
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("hides at once, and Undo means nothing is sent", () => {
    const { result } = renderHook(() => ({ remove: useUndoableDelete(), hidden: useHiddenPosts() }), { wrapper })
    act(() => result.current.remove([7], "Draft deleted"))
    expect(result.current.hidden.has(7)).toBe(true)

    const options = toastMock.mock.calls[0][1] as { action: { onClick: () => void } }
    act(() => options.action.onClick())
    expect(result.current.hidden.has(7)).toBe(false)
    act(() => void vi.advanceTimersByTime(10_000))
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends the DELETE when the undo window runs out", async () => {
    const { result } = renderHook(() => useUndoableDelete(), { wrapper })
    act(() => result.current([8, 9], "2 drafts deleted"))
    await act(async () => {
      vi.advanceTimersByTime(6_000)
      await Promise.resolve()
    })
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => url as string)
    expect(urls.some((u) => u.endsWith("/posts/8/"))).toBe(true)
    expect(urls.some((u) => u.endsWith("/posts/9/"))).toBe(true)
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("DELETE")
  })
})
