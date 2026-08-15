import { useEffect } from "react"
import { WallCanvas } from "./components/WallCanvas"
import { Sidebar } from "./components/Sidebar"
import { Dock } from "./components/Dock"
import { useAppStore } from "./store/useAppStore"
import { SEED_PROMISES } from "./lib/seed"

export default function App() {
  const setPromises = useAppStore((s) => s.setPromises)

  useEffect(() => {
    setPromises(SEED_PROMISES)
  }, [setPromises])

  return (
    <div className="app">
      <Sidebar />
      <WallCanvas />
      <Dock />
    </div>
  )
}
