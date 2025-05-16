import { createRoot } from 'react-dom/client'
import './index.css'
import OmniRouter from './router'
import { ThemeProvider } from './components/theme-provider'
import AuthProvider from './contexts/authProvider'
import { Toaster } from './components/ui/sonner'

createRoot(document.getElementById('root')!).render(
    <ThemeProvider>
    <AuthProvider>
        <OmniRouter />
    </AuthProvider>
    <Toaster />

    </ThemeProvider>
)
