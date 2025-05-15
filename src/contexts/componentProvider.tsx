import { useState } from 'react';
import { ComponentContext } from './componentContext';


import { ReactNode } from 'react';

const ComponentProvider = ({ children }: { children: ReactNode }) => {
    const [createPostDialog, setCreatePostDialog] = useState(false);
    const openCreatePostDialog = () => {setCreatePostDialog(true)}
    const closeCreatePostDialog = () => {setCreatePostDialog(false)}



    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCreatePostDialog();
        }
    })

    
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