import { useEffect, useState } from "react"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { signIn, signUp, resetPasswordForEmail, updateUserPassword } from "../lib/api"

export function AuthModal() {
  const t = useT()
  const open = useAppStore((s) => s.authOpen)
  const setAuthOpen = useAppStore((s) => s.setAuthOpen)
  const showToast = useAppStore((s) => s.showToast)

  const [signup, setSignup] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Detect an in-app password-recovery session (from the reset email link).
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true)
        setForgotSent(false)
        setAuthOpen(true)
      }
    })
    return () => sub.data.subscription.unsubscribe()
  }, [setAuthOpen])

  const authError = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e)
    if (/invalid login credentials/i.test(msg)) return t("auth.errCredentials")
    if (/email not confirmed/i.test(msg)) return t("auth.errNotConfirmed")
    if (/already registered|already been registered/i.test(msg)) return t("auth.errEmailInUse")
    if (/rate limit|too many/i.test(msg)) return t("auth.errRateLimit")
    return msg
  }

  const onForgot = async () => {
    setError("")
    if (!email.trim()) {
      setError(t("auth.errRequired"))
      return
    }
    if (!isSupabaseConfigured) {
      setError(t("auth.noBackend"))
      return
    }
    setLoading(true)
    try {
      await resetPasswordForEmail(email.trim(), window.location.origin)
      setForgotSent(true)
    } catch (e) {
      setError(authError(e))
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    setError("")
    if (!isSupabaseConfigured) {
      setError(t("auth.noBackend"))
      return
    }
    if (recovery) {
      if (!password || password.length < 6) {
        setError(t("auth.errWeak"))
        return
      }
      if (password !== confirm) {
        setError(t("auth.pwMismatch"))
        return
      }
      setLoading(true)
      try {
        await updateUserPassword(password)
        setRecovery(false)
        setPassword("")
        setConfirm("")
        setAuthOpen(false)
        showToast(t("auth.pwUpdated"))
      } catch (e) {
        setError(authError(e))
      } finally {
        setLoading(false)
      }
      return
    }
    if (!email.trim() || !password) {
      setError(t("auth.errRequired"))
      return
    }
    if (signup && !name.trim()) {
      setError(t("auth.errName"))
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
      setError(authError(e))
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
        <h2>{recovery ? t("auth.pwNew") : signup ? t("auth.signupTitle") : t("auth.title")}</h2>
        <p className="sub">
          {recovery ? "—" : signup ? t("auth.signupSub") : t("auth.sub")}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          {recovery ? (
            <>
              <label>{t("auth.pwNew")}</label>
              <input
                type="password"
                placeholder={t("auth.pwNew")}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label>{t("auth.pwConfirm")}</label>
              <input
                type="password"
                placeholder={t("auth.pwConfirm")}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </>
          ) : (
            <>
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
            </>
          )}
          {forgotSent && !recovery && <div id="authError">{t("auth.forgotSent")}</div>}
          {error && <div id="authError">{error}</div>}
          <button id="authSubmit" type="submit" disabled={loading}>
            {recovery
              ? t("auth.pwSubmit")
              : signup
                ? t("auth.signup")
                : t("auth.signin")}
          </button>
        </form>
        {!signup && !recovery && !forgotSent && (
          <button className="link" onClick={() => void onForgot()}>
            {t("auth.forgot")}
          </button>
        )}
        {!recovery && (
          <button
            className="link"
            onClick={() => {
              setSignup((v) => !v)
              setForgotSent(false)
              setError("")
            }}
          >
            {signup ? t("auth.toggleSignin") : t("auth.toggleSignup")}
          </button>
        )}
      </div>
    </div>
  )
}
