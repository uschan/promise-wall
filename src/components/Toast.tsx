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

  if (!toast) return null
  return (
    <div className="toast" key={toast.key}>
      {toast.msg}
    </div>
  )
}
