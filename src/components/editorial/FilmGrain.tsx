/**
 * The fixed, full-viewport noise overlay used on both the landing page and
 * the app shell (App v2.dc.html / Landing Page v2.dc.html). A single SVG
 * feTurbulence data: URI, multiply-blended over everything beneath it — see
 * the `.film-grain` utility in src/index.css for the shared background.
 */
export default function FilmGrain({
  opacity = 0.26,
}: {
  /** 0.26 on the app shell, 0.30 on the landing page in the source design. */
  opacity?: number
}) {
  return <div className="film-grain" style={{ opacity }} aria-hidden="true" />
}
