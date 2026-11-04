import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import ErrorBoundary from "./components/ErrorBoundary"
import RequireAuth from "./components/require-auth"
import Landing from "./pages/Landing"

// Everything behind sign-in loads on demand, so a landing-page visitor
// doesn't download the calendar, composer and AI screens.
const App = lazy(() => import("./App"))
const Analytics = lazy(() => import("./pages/Analytics"))
const Approvals = lazy(() => import("./pages/Approvals"))
const Auth = lazy(() => import("./pages/Auth"))
const Calendar = lazy(() => import("./pages/Calendar"))
const ChannelDetail = lazy(() => import("./pages/ChannelDetail"))
const Connections = lazy(() => import("./pages/Connections"))
const Drafts = lazy(() => import("./pages/Drafts"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const NotFoundPage = lazy(() => import("./pages/NotFound"))
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"))
const Posts = lazy(() => import("./pages/Posts"))
const ResetPassword = lazy(() => import("./pages/ResetPassword"))
const Settings = lazy(() => import("./pages/Settings"))
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"))

// The six retired composer pages, mapped to the compose modal's kinds —
// both their /app/post-* and their original bare /post-* paths redirect to
// /app?compose=<kind>, which opens the modal at step two.
const COMPOSER_REDIRECTS: [string, string][] = [
  ["post-text", "text"],
  ["post-image", "image"],
  ["post-image-story", "story"],
  ["post-video", "video"],
  ["post-video-story", "story"],
  ["post-short-video", "short_video"],
]

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-page">
      <span className="eyebrow">Loading…</span>
    </div>
  )
}

// Landing owns "/"; the authenticated app lives under /app/*. Old bare
// paths still redirect so an existing bookmark or a stale link doesn't 404.
export default function OmniRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/register" element={<Auth mode="register" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            <Route
              path="/app"
              element={
                <RequireAuth>
                  <App />
                </RequireAuth>
              }
            >
              <Route index element={<Posts />} />
              <Route path="drafts" element={<Drafts />} />
              <Route path="connections" element={<Connections />} />
              <Route path="connections/:id" element={<ChannelDetail />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              {COMPOSER_REDIRECTS.map(([path, kind]) => (
                <Route key={path} path={path} element={<Navigate to={`/app?compose=${kind}`} replace />} />
              ))}
            </Route>

            {COMPOSER_REDIRECTS.map(([path, kind]) => (
              <Route key={path} path={`/${path}`} element={<Navigate to={`/app?compose=${kind}`} replace />} />
            ))}
            <Route path="/instance" element={<Navigate to="/app/connections" replace />} />
            <Route path="/drafts" element={<Navigate to="/app/drafts" replace />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
