import { WallCanvas } from "./components/WallCanvas"
import { Sidebar } from "./components/Sidebar"
import { Dock } from "./components/Dock"
import { PromisePanel } from "./components/PromisePanel"
import { Compose } from "./components/Compose"
import { AuthModal } from "./components/AuthModal"
import { Toast } from "./components/Toast"
import { AllView } from "./components/AllView"
import { ModPanel } from "./components/ModPanel"
import { Quote } from "./components/Quote"
import { usePromises } from "./hooks/usePromises"
import { useAuthInit } from "./hooks/useAuthInit"
import { useSettings } from "./hooks/useSettings"
import { useAppStore } from "./store/useAppStore"

export default function App() {
  const openCreate = useAppStore((s) => s.openCreate)
  usePromises()
  useAuthInit()
  useSettings()

  return (
    <div className="app">
      <Sidebar />
      <WallCanvas />
      <Quote />
      <Dock />
      <PromisePanel />
      <Compose />
      <AuthModal />
      <AllView />
      <ModPanel />
      <Toast />
      <button className="add-btn" onClick={openCreate} aria-label="Add a promise">
        +
      </button>
    </div>
  )
}
