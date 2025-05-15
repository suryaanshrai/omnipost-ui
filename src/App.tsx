import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import './App.css'
import { ModeToggle } from "./components/mode-toggle"
import { Outlet, useNavigate } from "react-router"
import ComponentProvider from "./contexts/componentProvider"
import AuthProvider from "./contexts/authProvider"
import { Toaster } from "sonner"
import { useEffect } from "react"
import useAuthContext from "./contexts/authContext"

function App() {
  return (
            <>
    <ComponentProvider>
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col min-h-screen w-full">
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1
              className="text-2xl tracking-tight italic bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent"
              style={{ fontFamily: 'cursive' }}
            >
              OmniPost Dashboard
            </h1>
            <div className="flex-1" />
            <ModeToggle />
          </header>
        </SidebarInset>
        <main className="flex flex-col items-center justify-center flex-1 w-full py-8">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
    </ComponentProvider>
    </>
  )
}

export default App
