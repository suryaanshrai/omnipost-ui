import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import PlanInterest from "@/components/landing/PlanInterest"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("PlanInterest", () => {
  it("records an email for the plan", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response("{}", { status: 201 })))
    vi.stubGlobal("fetch", fetchMock)
    render(<PlanInterest plan="creator" />)
    fireEvent.click(screen.getByRole("button", { name: "Tell me when it opens" }))
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "me@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }))
    expect(await screen.findByText(/We'll email you/)).toBeTruthy()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/public\/interest\/$/)
    expect(JSON.parse(init.body as string)).toEqual({ email: "me@example.com", plan: "creator" })
  })
})
