import { createContext, useContext } from "react";

export const ComponentContext = createContext({
    createPostDialog: false,
    openCreatePostDialog: () => {},
    closeCreatePostDialog: () => {},
})

export default function useComponentContext() {
    return useContext(ComponentContext);
}