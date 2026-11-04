import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiFetch, ApiError, getToken, safeNextPath, setToken } from "@/lib/api"

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body), { status })
  )
}

describe("apiFetch", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal("location", { ...window.location, assign: vi.fn(), pathname: "/app/drafts", search: "?x=1" })
  })
  afterEach(() => vi.unstubAllGlobals())

  it("sends the token and JSON-encodes plain bodies", async () => {
    setToken("abc")
    const fetchMock = respond(200, { ok: true })
    vi.stubGlobal("fetch", fetchMock)
    await apiFetch("/posts/", { method: "POST", body: { a: 1 } })
    const [, init] = fetchMock.mock.calls[0]
    expect(new Headers(init.headers).get("Authorization")).toBe("Token abc")
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json")
    expect(init.body).toBe('{"a":1}')
  })

  it("turns DRF field errors into ApiError.fieldErrors with a readable detail", async () => {
    vi.stubGlobal("fetch", respond(400, { email: ["Enter a valid email."], non_field_errors: ["Nope."] }))
    const err = (await apiFetch("/x/").catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.fieldErrors.email).toEqual(["Enter a valid email."])
    expect(err.detail).toBe("Enter a valid email.")
  })

  it("never shows an HTML error page verbatim", async () => {
    vi.stubGlobal("fetch", respond(502, "<html>Bad gateway</html>"))
    const err = (await apiFetch("/x/").catch((e: unknown) => e)) as ApiError
    expect(err.detail).toMatch(/server hit an error/)
  })

  it("on 401 clears the token and returns to the same screen after sign-in", async () => {
    setToken("abc")
    vi.stubGlobal("fetch", respond(401, { detail: "Invalid token." }))
    await apiFetch("/x/").catch(() => {})
    expect(getToken()).toBeNull()
    expect(window.location.assign).toHaveBeenCalledWith("/login?next=%2Fapp%2Fdrafts%3Fx%3D1")
  })
})

describe("safeNextPath", () => {
  it("only allows in-app paths", () => {
    expect(safeNextPath("/app/settings")).toBe("/app/settings")
    expect(safeNextPath("https://evil.example")).toBe("/app")
    expect(safeNextPath("//evil.example/app")).toBe("/app")
    expect(safeNextPath(null)).toBe("/app")
  })
})
