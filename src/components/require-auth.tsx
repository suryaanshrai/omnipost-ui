import { Navigate, useLocation } from "react-router"
import type { ReactNode } from "react"
import { getToken } from "@/lib/api"

/**
 * Route guard for /app/*. Only checks that a token exists; the first API
 * call that gets a 401 clears it and sends the user back to /login.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!getToken()) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  return <>{children}</>
}
