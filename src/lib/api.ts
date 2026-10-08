// The shared fetch layer. Replaced the old src/lib/handle-api-response.ts:
// handleApiResponse returned `any` and fired a toast from inside the fetch
// layer itself, so every call site had to separately re-check `data.invalid`
// after already getting a rejected promise. apiFetch<T>() is typed, throws a
// single ApiError shape on any non-2xx response, and leaves deciding what to
// do about it (toast, inline field errors, redirect) to the caller.
import conf from "@/conf"

const TOKEN_KEY = "omniUserToken"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
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
  /** Skip the Authorization header — only /auth/login/ and /auth/registration/ need this. */
  anonymous?: boolean
}

/**
 * Fetches `path` against the configured API origin (see src/conf.ts).
 * Injects `Authorization: Token <key>` unless `anonymous` is set, JSON-
 * encodes a plain-object `body` automatically (pass a FormData/Blob body
 * for multipart uploads and it's sent as-is), and throws `ApiError` for any
 * non-2xx response. A 401 additionally clears the stored token and does a
 * hard redirect to /login — there is no single React tree location that
 * every caller of apiFetch is guaranteed to render under, so this can't
 * rely on a router navigate() the way a component-level 401 handler could.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { anonymous, headers, body, ...rest } = options
  const plain = isPlainBody(body)

  const finalHeaders = new Headers(headers)
  if (plain) finalHeaders.set("Content-Type", "application/json")
  if (!anonymous) {
    const token = getToken()
    if (token) finalHeaders.set("Authorization", `Token ${token}`)
  }

  const response = await fetch(`${conf.api_url}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: plain ? JSON.stringify(body) : (body as BodyInit | null | undefined),
  })

  if (response.status === 204) return undefined as T

  const text = await response.text()
  const data = text ? safeJsonParse(text) : undefined

  if (!response.ok) {
    if (response.status === 401 && !anonymous) {
      setToken(null)
      window.location.assign("/login")
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
