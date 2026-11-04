import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import BioPage from "@/pages/BioPage"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/bio/:slug" element={<BioPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("BioPage", () => {
  it("shows links and posts, and never renders a non-http link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              name: "Studio",
              description: "Hello",
              links: [
                { label: "Shop", url: "https://shop.example" },
                { label: "Bad", url: "javascript:alert(1)" },
              ],
              posts: [{ text: "Launch day", url: "https://bsky.app/p/1", published_at: null }],
            }),
            { status: 200 }
          )
        )
      )
    )
    renderAt("/bio/studio")
    expect(await screen.findByRole("heading", { name: "Studio" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Shop" }).getAttribute("href")).toBe("https://shop.example/")
    expect(screen.queryByText("Bad")).toBeNull()
    expect(screen.getByRole("link", { name: /Launch day/ }).getAttribute("rel")).toContain("nofollow")
  })

  it("says so when the page isn't public", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response('{"detail":"Not found."}', { status: 404 }))))
    renderAt("/bio/nope")
    expect(await screen.findByText("Nothing here")).toBeTruthy()
  })
})
