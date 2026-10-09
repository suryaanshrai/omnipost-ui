import { useState } from 'react';
import { AuthContext } from './authContext';

import type { ReactNode } from 'react';

const AuthProvider = ({children}: {children: ReactNode}) => {
    const [user, setUser] = useState("");
    // Previously always started false/"" and was only ever populated by
    // Home.tsx's /auth/user/ call — so on any page besides "/", or on any
    // refresh, signedIn was false and the sidebar's username was blank even
    // though a valid token sat in localStorage the whole time. Hydrating
    // from the stored token here means the UI reflects "was signed in"
    // immediately; RequireAuth still gates route access on the token
    // itself, and whichever screen calls /auth/user/ remains the source of
    // truth that clears it again on a 401.
    const [signedIn, setSignedIn] = useState(() => !!localStorage.getItem("omniUserToken"));
    const [token, setToken] = useState(() => localStorage.getItem("omniUserToken") ?? "");
    const toggleSignedIn = (flag:boolean) => setSignedIn(flag);
    const updateUser = (user: string) => setUser(user);
    const updateToken = (token: string) => setToken(token);
    return (
        <AuthContext.Provider value={{
            user,
            signedIn,
            token,
            updateUser,
            toggleSignedIn,
            updateToken,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider;