import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import App from './App';
import RequireAuth from './components/require-auth';
import Analytics from './pages/Analytics';
import Approvals from './pages/Approvals';
import Auth from './pages/Auth';
import Calendar from './pages/Calendar';
import Drafts from './pages/Drafts';
import ChannelDetail from './pages/ChannelDetail';
import Connections from './pages/Connections';
import Landing from './pages/Landing';
import NotFoundPage from './pages/NotFound';
import OAuthCallback from './pages/OAuthCallback';
import Posts from './pages/Posts';
import Settings from './pages/Settings';

// The six retired composer pages, mapped to the compose modal's kinds —
// both their /app/post-* and their original bare /post-* paths redirect to
// /app?compose=<kind>, which opens the modal at step two.
const COMPOSER_REDIRECTS: [string, string][] = [
    ['post-text', 'text'],
    ['post-image', 'image'],
    ['post-image-story', 'story'],
    ['post-video', 'video'],
    ['post-video-story', 'story'],
    ['post-short-video', 'short_video'],
];

// Landing owns "/"; the authenticated app lives under /app/*. Old bare
// paths still redirect so an existing bookmark or a stale link doesn't 404.
export default function OmniRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Auth mode="login" />} />
                <Route path="/register" element={<Auth mode="register" />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />

                <Route path="/app" element={<RequireAuth><App /></RequireAuth>}>
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
        </BrowserRouter>
    )
}
