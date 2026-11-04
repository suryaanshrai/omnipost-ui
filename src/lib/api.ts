// The shared fetch layer. Replaced the old src/lib/handle-api-response.ts:
// handleApiResponse returned `any` and fired a toast from inside the fetch
// layer itself, so every call site had to separately re-check `data.invalid`
// after already getting a rejected promise. apiFetch<T>() is typed, throws a
// single ApiError shape on any non-2xx response, and leaves deciding what to
// do about it (toast, inline field errors, redirect) to the caller.
import conf from "@/conf"

// Signing in sets an httpOnly cookie that page scripts can't read, so a
// script injected into the page can't steal the session. The API only
// accepts that cookie together with this header, which another site can't
// send. SIGNED_IN_KEY is just a hint for routing ("show the app or the
// login page?"); it isn't a credential, and the API decides.
export const CLIENT_HEADER = "X-OmniPost-Client"
const SIGNED_IN_KEY = "omniSignedIn"
// Before the cookie, the session token itself was kept here.
const LEGACY_TOKEN_KEY = "omniUserToken"

export function isSignedIn(): boolean {
  return localStorage.getItem(SIGNED_IN_KEY) === "1" || !!localStorage.getItem(LEGACY_TOKEN_KEY)
}

export function setSignedIn(signedIn: boolean): void {
  if (signedIn) localStorage.setItem(SIGNED_IN_KEY, "1")
  else localStorage.removeItem(SIGNED_IN_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

let migration: Promise<void> | null = null

/** Moves a sign-in from before the cookie into the cookie, once, without
 * asking for the password again. */
function migrateLegacyToken(): Promise<void> {
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY)
  if (!legacy) return Promise.resolve()
  migration ??= fetch(`${conf.api_url}/auth/cookie/`, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Token ${legacy}`, [CLIENT_HEADER]: "web" },
  })
    .then((response) => {
      if (response.ok) setSignedIn(true)
      else if (response.status === 401) setSignedIn(false)
    })
    .catch(() => {})
    .finally(() => {
      migration = null
    })
  return migration
}

/** Where to send someone after they sign in: an in-app path only, never another origin. */
export function safeNextPath(raw: string | null | undefined): string {
  return raw && raw.startsWith("/app") && !raw.startsWith("//") ? raw : "/app"
}

/**
 * A normalized DRF error response. `fieldErrors` covers both per-field
 * validation (`{"name": ["This field is required."]}`) and
 * `non_field_errors` — `detail` is always a single displayable string,
 * preferring `detail`/`non_field_errors` and falling back to the first
 * field error found, so a bare `toast.error(err.detail)` is always
 * reasonable even when the caller doesn't inspect fieldErrors itself.
 */
export class ApiError extends Error {
  status: number
  detail: string
  fieldErrors: Record<string, string[]>

  constructor(status: number, detail: string, fieldErrors: Record<string, string[]> = {}) {
    super(detail)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
    this.fieldErrors = fieldErrors
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function parseDrfError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const obj = body as Record<string, unknown>
    const fieldErrors: Record<string, string[]> = {}
    let detail = ""
    for (const [key, value] of Object.entries(obj)) {
      const messages = (Array.isArray(value) ? value : [value]).map(String)
      if (key === "detail") {
        detail = messages.join(" ")
      } else {
        fieldErrors[key] = messages
        if (!detail) detail = messages.join(" ")
      }
    }
    return new ApiError(status, detail || `Request failed (${status})`, fieldErrors)
  }
  // DRF renders a bare `raise ValidationError("message")` as a JSON array
  // of strings, not an object.
  if (Array.isArray(body) && body.length) {
    return new ApiError(status, body.map(String).join(" "))
  }
  // A non-JSON body (a proxy's or Django's HTML error page) is never shown verbatim.
  if (typeof body === "string" && body && !/^\s*</.test(body) && body.length < 300) {
    return new ApiError(status, body)
  }
  return new ApiError(
    status,
    status >= 500 ? `The server hit an error (${status}). Try again in a moment.` : `Request failed (${status})`
  )
}

function isPlainBody(body: unknown): body is Record<string, unknown> {
  return (
    body !== null &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof URLSearchParams)
  )
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | null
  /** Not signed in (login, signup, public pages): a 401 doesn't redirect to /login. */
  anonymous?: boolean
}

/**
 * Fetches `path` against the configured API origin (see src/conf.ts), with
 * the sign-in cookie and the client header. JSON-encodes a plain-object
 * `body` automatically (pass a FormData/Blob body for multipart uploads and
 * it's sent as-is), and throws `ApiError` for any non-2xx response. A 401
 * additionally marks you signed out and does a
 * hard redirect to /login — there is no single React tree location that
 * every caller of apiFetch is guaranteed to render under, so this can't
 * rely on a router navigate() the way a component-level 401 handler could.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { anonymous, headers, body, ...rest } = options
  const plain = isPlainBody(body)

  if (!anonymous) await migrateLegacyToken()
  const finalHeaders = new Headers(headers)
  if (plain) finalHeaders.set("Content-Type", "application/json")
  finalHeaders.set(CLIENT_HEADER, "web")
  // Only if moving it to the cookie failed (e.g. offline): keep it working.
  const legacy = anonymous ? null : localStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacy) finalHeaders.set("Authorization", `Token ${legacy}`)

  const response = await fetch(`${conf.api_url}${path}`, {
    ...rest,
    credentials: "include",
    headers: finalHeaders,
    body: plain ? JSON.stringify(body) : (body),
  })

  if (response.status === 204) return undefined as T

  const text = await response.text()
  const data = text ? safeJsonParse(text) : undefined

  if (!response.ok) {
    if (response.status === 401 && !anonymous) {
      setSignedIn(false)
      // Come back to the same screen after signing in again.
      const here = `${window.location.pathname}${window.location.search}`
      window.location.assign(`/login?next=${encodeURIComponent(here)}`)
    }
    throw parseDrfError(response.status, data)
  }

  return data as T
}

/** The shape every paginated list endpoint returns (LimitOffsetPagination, PAGE_SIZE=25). */
export interface Page<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
