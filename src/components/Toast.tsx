import { useEffect } from "react"
import { useAppStore } from "../store/useAppStore"

export function Toast() {
  const toast = useAppStore((s) => s.toast)
  const clearToast = useAppStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(clearToast, 2600)
    return () => clearTimeout(timer)
  }, [toast, clearToast])

  return (
    <div id="toast" className={toast ? "show" : ""}>
      <svg viewBox="0 0 24 24">
        <path d="M5 13l4.5 4.5L19 7" />
      </svg>
      <span>{toast?.msg ?? ""}</span>
    </div>
  )
}
