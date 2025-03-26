import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { Button } from "@/components/ui/button"


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <Button>Click me</Button>
        <Button variant="destructive">Click me</Button>
        <Button variant="outline">Click me</Button>
        <Button variant="secondary">Click me</Button>
        <Button variant="primary">Click me</Button>
        <Button variant="ghost">Click me</Button>
        <Button variant="link">Click me</Button>
      </div>
    </>
  )
}

export default App
