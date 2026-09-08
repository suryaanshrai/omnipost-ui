import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";

/**
 * Route guard. Previously only Home.tsx checked for a token — every other
 * route (drafts, instance, the composers) rendered fully and then fired
 * unauthorized requests. This wraps the whole authenticated layout instead.
 *
 * It only checks that a token exists, not that it's still valid — Home.tsx's
 * `/auth/user/` call remains the source of truth for session validity and
 * still clears the token and redirects on a 401.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem("omniUserToken");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
