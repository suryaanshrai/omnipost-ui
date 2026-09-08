import {createContext, useContext} from "react";

export const AuthContext = createContext({
    user: "",
    signedIn: false,
    token: "",
    updateUser: (_user: string) => {},
    toggleSignedIn: (_signedIn: boolean) => {},
    updateToken: (_token: string) => {},
});

export default function useAuthContext() {
    return useContext(AuthContext);
}