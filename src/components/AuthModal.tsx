import { useState } from "react"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { isSupabaseConfigured } from "../lib/supabase"
import { signIn, signUp } from "../lib/api"

export function AuthModal() {
  const t = useT()
  const open = useAppStore((s) => s.authOpen)
  const setAuthOpen = useAppStore((s) => s.setAuthOpen)

  const [signup, setSignup] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const submit = async () => {
    setError("")
    if (!email.trim() || !password) {
      setError(t("auth.errRequired"))
      return
    }
    if (signup && !name.trim()) {
      setError(t("auth.errName"))
      return
    }
    if (!isSupabaseConfigured) {
      setError(t("auth.noBackend"))
      return
    }
    setLoading(true)
    try {
      if (signup) {
        await signUp(email.trim(), password, name.trim())
        setError(t("auth.errConfirm"))
      } else {
        await signIn(email.trim(), password)
        setAuthOpen(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={() => setAuthOpen(false)}>
      <form
        className="auth"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <h2>{signup ? t("auth.signupTitle") : t("auth.title")}</h2>
        <p className="sub">{signup ? t("auth.signupSub") : t("auth.sub")}</p>
        {signup && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.name")} />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("auth.email")}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.password")}
        />
        {error && <p className="auth-error">{error}</p>}
        <button className="pill primary" type="submit" disabled={loading}>
          {signup ? t("auth.signup") : t("auth.signin")}
        </button>
        <button
          className="link"
          type="button"
          onClick={() => {
            setSignup((v) => !v)
            setError("")
          }}
        >
          {signup ? t("auth.toggleSignin") : t("auth.toggleSignup")}
        </button>
      </form>
    </div>
  )
}
