import {BrowserRouter, Routes, Route, useNavigate} from 'react-router';
import App from './App';
import Home from './pages/Home';
import CreateImagePost from './components/create-image-post';
import CreateVideoPost from './components/create-video-post';
import CreateVideoStory from './components/create-video-story';
import CreateTextPost from './components/create-text-post';
import CreateImageStory from './components/create-image-story';
import CreateShortVideoPost from './components/create-short-video-post';
import LoginPage from './pages/Login';
import { RegistrationForm } from './components/registration-form';
import NotFoundPage from './pages/NotFound';
import RegistrationPage from './pages/Register';
import { useEffect } from 'react';
import useAuthContext from './contexts/authContext';
import Instance from './pages/Instance';
import Drafts from './pages/Drafts';

export default function OmniRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="" element={<App />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/post-image" element={<CreateImagePost />} />
                    <Route path="/post-image-story" element={<CreateImageStory />} />
                    <Route path="/post-video" element={<CreateVideoPost />} />
                    <Route path="/post-video-story" element={<CreateVideoStory />} />
                    <Route path="/post-text" element={<CreateTextPost />} />
                    <Route path="/post-short-video" element={<CreateShortVideoPost />} />
                    <Route path="/instance" element={<Instance />} />
                    <Route path="drafts" element={<Drafts />} />
                </Route>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegistrationPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    )
}