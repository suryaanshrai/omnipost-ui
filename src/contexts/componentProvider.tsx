import { useEffect, useState } from 'react';
import { ComponentContext } from './componentContext';

import type { ReactNode } from 'react';

const ComponentProvider = ({ children }: { children: ReactNode }) => {
    const [createPostDialog, setCreatePostDialog] = useState(false);
    const openCreatePostDialog = () => {setCreatePostDialog(true)}
    const closeCreatePostDialog = () => {setCreatePostDialog(false)}

    // Was previously registered on every render with no cleanup, leaking one
    // listener per re-render.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeCreatePostDialog();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <ComponentContext.Provider
            value={{
                createPostDialog,
                openCreatePostDialog,
                closeCreatePostDialog,
            }}
        >
            {children}
        </ComponentContext.Provider>
    );

}

export default ComponentProvider;