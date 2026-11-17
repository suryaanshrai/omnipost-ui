import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import OmniRouter from './router'
import { ThemeProvider } from './components/theme-provider'
import Banner from './components/editorial/Banner'
import { queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <OmniRouter />
    <Banner />

    </ThemeProvider>
    </QueryClientProvider>
)
