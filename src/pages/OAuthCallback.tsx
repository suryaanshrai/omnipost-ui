/**
 * Placeholder landing spot for a connector's OAuth redirect. The real
 * exchange (reading `code`/`state` off the query string, POSTing to
 * /oauth/complete/) is built in Phase C's OAuth spike and generalized in
 * Phase F — this route exists now so a provider's redirect_uri has
 * somewhere real to land rather than 404ing while those phases are pending.
 */
export default function OAuthCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page text-sm text-ink-55">
      Connecting your account…
    </div>
  )
}
