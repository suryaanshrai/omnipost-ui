import HomePage from "./pages/Home";
import { ThemeProvider } from "@/components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
    <div>
      <HomePage/>
    </div>
    </ThemeProvider>

  )
}

export default App
