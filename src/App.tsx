import { WallCanvas } from "./components/WallCanvas"
import { Sidebar } from "./components/Sidebar"
import { Topbar } from "./components/Topbar"
import { Dock } from "./components/Dock"
import { PromisePanel } from "./components/PromisePanel"
import { Compose } from "./components/Compose"
import { AuthModal } from "./components/AuthModal"
import { AllView } from "./components/AllView"
import { ModPanel } from "./components/ModPanel"
import { ShareModal } from "./components/ShareModal"
import { Toast } from "./components/Toast"
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
    <>
      <WallCanvas />
      <Sidebar />
      <Topbar />
      <button id="addBtn" onClick={openCreate} aria-label="Add a promise">
        +
      </button>
      <Dock />
      <PromisePanel />
      <Compose />
      <AuthModal />
      <AllView />
      <ModPanel />
      <ShareModal />
      <Toast />
    </>
  )
}
