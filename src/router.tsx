import {BrowserRouter, Routes, Route, Navigate} from 'react-router';
import App from './App';
import Home from './pages/Home';
import CreateImagePost from './components/create-image-post';
import CreateVideoPost from './components/create-video-post';
import CreateVideoStory from './components/create-video-story';
import CreateTextPost from './components/create-text-post';
import CreateImageStory from './components/create-image-story';
import CreateShortVideoPost from './components/create-short-video-post';
import LoginPage from './pages/Login';
import NotFoundPage from './pages/NotFound';
import RegistrationPage from './pages/Register';
import Instance from './pages/Instance';
import Drafts from './pages/Drafts';
import Landing from './pages/Landing';
import OAuthCallback from './pages/OAuthCallback';
import RequireAuth from './components/require-auth';

// Landing owns "/" (Phase B); the authenticated app lives under /app/*
// (Phase D onward gives it its own visual pass — for now these are the
// same screens that used to hang off the bare "/", just remounted here).
// The old bare paths still work as redirects, so an existing bookmark or a
// stale link doesn't 404.
export default function OmniRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegistrationPage />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />

                <Route path="/app" element={<RequireAuth><App /></RequireAuth>}>
                    <Route index element={<Home />} />
                    <Route path="drafts" element={<Drafts />} />
                    <Route path="connections" element={<Instance />} />
                    <Route path="post-image" element={<CreateImagePost />} />
                    <Route path="post-image-story" element={<CreateImageStory />} />
                    <Route path="post-video" element={<CreateVideoPost />} />
                    <Route path="post-video-story" element={<CreateVideoStory />} />
                    <Route path="post-text" element={<CreateTextPost />} />
                    <Route path="post-short-video" element={<CreateShortVideoPost />} />
                </Route>

                <Route path="/post-image" element={<Navigate to="/app/post-image" replace />} />
                <Route path="/post-image-story" element={<Navigate to="/app/post-image-story" replace />} />
                <Route path="/post-video" element={<Navigate to="/app/post-video" replace />} />
                <Route path="/post-video-story" element={<Navigate to="/app/post-video-story" replace />} />
                <Route path="/post-text" element={<Navigate to="/app/post-text" replace />} />
                <Route path="/post-short-video" element={<Navigate to="/app/post-short-video" replace />} />
                <Route path="/instance" element={<Navigate to="/app/connections" replace />} />
                <Route path="/drafts" element={<Navigate to="/app/drafts" replace />} />

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    )
}