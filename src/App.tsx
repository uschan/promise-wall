import { WallCanvas } from "./components/WallCanvas"
import { Sidebar } from "./components/Sidebar"
import { Dock } from "./components/Dock"
import { PromisePanel } from "./components/PromisePanel"
import { Compose } from "./components/Compose"
import { AuthModal } from "./components/AuthModal"
import { Toast } from "./components/Toast"
import { usePromises } from "./hooks/usePromises"
import { useAuthInit } from "./hooks/useAuthInit"
import { useAppStore } from "./store/useAppStore"

export default function App() {
  const setComposeOpen = useAppStore((s) => s.setComposeOpen)
  usePromises()
  useAuthInit()

  return (
    <div className="app">
      <Sidebar />
      <WallCanvas />
      <Dock />
      <PromisePanel />
      <Compose />
      <AuthModal />
      <Toast />
      <button className="add-btn" onClick={() => setComposeOpen(true)} aria-label="Add a promise">
        +
      </button>
    </div>
  )
}
