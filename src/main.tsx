import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import "./index.css"
import OmniRouter from "./router"
import { ThemeProvider } from "./components/theme-provider"
import Banner from "./components/editorial/Banner"
import { queryClient } from "./lib/queryClient"
import { reloadForStaleChunk } from "./lib/staleChunk"

// A screen's code file failed to load, usually because a deploy replaced
// it while this tab was open: reload once to get the new ones.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForStaleChunk()) event.preventDefault()
})

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <OmniRouter />
      <Banner />
    </ThemeProvider>
  </QueryClientProvider>
)
