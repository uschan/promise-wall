import { WallCanvas } from "./components/WallCanvas"
import { Sidebar } from "./components/Sidebar"
import { Dock } from "./components/Dock"
import { PromisePanel } from "./components/PromisePanel"
import { Compose } from "./components/Compose"
import { usePromises } from "./hooks/usePromises"
import { useAppStore } from "./store/useAppStore"

export default function App() {
  const setComposeOpen = useAppStore((s) => s.setComposeOpen)
  usePromises()

  return (
    <div className="app">
      <Sidebar />
      <WallCanvas />
      <Dock />
      <PromisePanel />
      <Compose />
      <button className="add-btn" onClick={() => setComposeOpen(true)} aria-label="Add a promise">
        +
      </button>
    </div>
  )
}
