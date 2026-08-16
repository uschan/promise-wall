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
  const menuOpen = useAppStore((s) => s.menuOpen)
  const setMenuOpen = useAppStore((s) => s.setMenuOpen)
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
      {menuOpen && (
        <div id="sidebarBackdrop" className="show" onClick={() => setMenuOpen(false)} />
      )}
      <Topbar />
      <button id="addBtn" onClick={openCreate} aria-label="Add a promise">
        +
      </button>
      <div id="addHint">
        <svg viewBox="0 0 24 24">
          <path d="M19 4c-5 1-9 5-10.5 11" />
          <path d="M8 10.5L8.4 15.3 13 14" />
        </svg>
        <span className="hint-key">J</span> Add your
        <br />
        promise anywhere.
      </div>
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
