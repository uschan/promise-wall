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
        const data = await signUp(email.trim(), password, name.trim())
        if (data.session) setAuthOpen(false)
        else setError(t("auth.errConfirm"))
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
    <div
      id="authWrap"
      className={open ? "open" : ""}
      role="dialog"
      aria-modal="true"
      onClick={() => setAuthOpen(false)}
    >
      <div id="authBox" onClick={(e) => e.stopPropagation()}>
        <button aria-label="Close" onClick={() => setAuthOpen(false)}>
          ×
        </button>
        <h2>{signup ? t("auth.signupTitle") : t("auth.title")}</h2>
        <p className="sub">{signup ? t("auth.signupSub") : t("auth.sub")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          {signup && (
            <>
              <label>{t("auth.name")}</label>
              <input
                type="text"
                placeholder={t("auth.namePh")}
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}
          <label>{t("auth.email")}</label>
          <input
            type="email"
            placeholder={t("auth.emailPh")}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>{t("auth.password")}</label>
          <input
            type="password"
            placeholder={t("auth.pwPh")}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div id="authError">{error}</div>}
          <button id="authSubmit" type="submit" disabled={loading}>
            {signup ? t("auth.signup") : t("auth.signin")}
          </button>
        </form>
        <button
          className="link"
          onClick={() => {
            setSignup((v) => !v)
            setError("")
          }}
        >
          {signup ? t("auth.toggleSignin") : t("auth.toggleSignup")}
        </button>
      </div>
    </div>
  )
}
