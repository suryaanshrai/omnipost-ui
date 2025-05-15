import { createRoot } from 'react-dom/client'
import './index.css'
import OmniRouter from './router'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from 'sonner'
import AuthProvider from './contexts/authProvider'

createRoot(document.getElementById('root')!).render(
    <ThemeProvider>
    <AuthProvider>
        <OmniRouter />
        <Toaster />
    </AuthProvider>
    </ThemeProvider>
)
