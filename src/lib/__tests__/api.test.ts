import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiFetch, ApiError, isSignedIn, safeNextPath, setSignedIn } from "@/lib/api"

function respond(status: number, body: unknown) {
  return vi.fn().mockImplementation(() =>
    Promise.resolve(new Response(body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body), { status }))
  )
}

describe("apiFetch", () => {
  const assign = vi.fn()
  beforeEach(() => {
    localStorage.clear()
    assign.mockReset()
    vi.stubGlobal("location", { ...window.location, assign, pathname: "/app/drafts", search: "?x=1" })
  })
  afterEach(() => vi.unstubAllGlobals())

  it("sends the sign-in cookie and client header, never a token, and JSON-encodes bodies", async () => {
    setSignedIn(true)
    const fetchMock = respond(200, { ok: true })
    vi.stubGlobal("fetch", fetchMock)
    await apiFetch("/posts/", { method: "POST", body: { a: 1 } })
    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(init.credentials).toBe("include")
    expect(headers.get("X-OmniPost-Client")).toBe("web")
    expect(headers.get("Authorization")).toBeNull()
    expect(headers.get("Content-Type")).toBe("application/json")
    expect(init.body).toBe('{"a":1}')
  })

  it("moves a sign-in from before the cookie into the cookie, once", async () => {
    localStorage.setItem("omniUserToken", "legacy")
    const fetchMock = respond(200, {})
    vi.stubGlobal("fetch", fetchMock)
    await apiFetch("/workspaces/")
    await apiFetch("/workspaces/")
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/auth\/cookie\/$/)
    expect(new Headers(init.headers).get("Authorization")).toBe("Token legacy")
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(localStorage.getItem("omniUserToken")).toBeNull()
    expect(isSignedIn()).toBe(true)
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

  it("on 401 signs out and returns to the same screen after sign-in", async () => {
    setSignedIn(true)
    vi.stubGlobal("fetch", respond(401, { detail: "Invalid token." }))
    await apiFetch("/x/").catch(() => {})
    expect(isSignedIn()).toBe(false)
    expect(assign).toHaveBeenCalledWith("/login?next=%2Fapp%2Fdrafts%3Fx%3D1")
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
