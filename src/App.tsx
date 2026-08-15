import { useEffect } from "react"
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
import { TemplateModal } from "./components/TemplateModal"
import { Toast } from "./components/Toast"
import { usePromises } from "./hooks/usePromises"
import { useAuthInit } from "./hooks/useAuthInit"
import { useSettings } from "./hooks/useSettings"
import { useAppStore } from "./store/useAppStore"
import { useT } from "./i18n/useT"

export default function App() {
  const t = useT()
  const openCreate = useAppStore((s) => s.openCreate)
  const placing = useAppStore((s) => s.placing)
  usePromises()
  useAuthInit()
  useSettings()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useAppStore.getState().setPlacing(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

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
      <TemplateModal />
      <AllView />
      <ModPanel />
      <ShareModal />
      <Toast />
      {placing && <div id="placeHint">{t("place.hint")}</div>}
    </>
  )
}
