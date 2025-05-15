import {createContext, useContext} from "react";

export const AuthContext = createContext({
    user: "",
    signedIn: false,
    token: "",
    updateUser: (user: string) => {},
    toggleSignedIn: (signedIn: boolean) => {},
    updateToken: (token: string) => {},
});

export default function useAuthContext() {
    return useContext(AuthContext);
}