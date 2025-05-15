import { useState } from 'react';
import { AuthContext } from './authContext';

import { ReactNode } from 'react';

const AuthProvider = ({children}: {children: ReactNode}) => {
    const [user, setUser] = useState("");
    const [signedIn, setSignedIn] = useState(false);
    const [token, setToken] = useState("");
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