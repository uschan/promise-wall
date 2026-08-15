import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { isSupabaseConfigured } from "../lib/supabase"
import {
  fetchReports,
  deleteReport,
  fetchAllProfiles,
  setUserBanned,
  deletePromise,
  fetchSettings,
  saveSettings,
  resetWall,
} from "../lib/api"
import { DEFAULT_CATEGORIES } from "../lib/categories"
import type { Category, Profile, Report } from "../lib/types"

type Tab = "reports" | "promises" | "users" | "settings"

export function ModPanel() {
  const t = useT()
  const open = useAppStore((s) => s.modOpen)
  const setModOpen = useAppStore((s) => s.setModOpen)
  const showToast = useAppStore((s) => s.showToast)
  const promises = useAppStore((s) => s.promises)
  const setStoreCategories = useAppStore((s) => s.setCategories)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<Tab>("reports")
  const [reports, setReports] = useState<Report[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [templates, setTemplates] = useState("")
  const [quotes, setQuotes] = useState("")
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [rateLimit, setRateLimit] = useState(1)

  const load = async () => {
    if (!isSupabaseConfigured) return
    try {
      const [r, p, s] = await Promise.all([fetchReports(), fetchAllProfiles(), fetchSettings()])
      setReports(r)
      setProfiles(p)
      setTemplates((s.templates ?? []).join("\n"))
      setQuotes((s.quotes ?? []).join("\n"))
      setCategories(s.categories ?? DEFAULT_CATEGORIES)
      setRateLimit(s.rateLimit ?? 1)
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    if (open) {
      setTab("reports")
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["promises"] })

  const removePromise = async (id: string) => {
    if (!window.confirm(t("mod.remove") + "?")) return
    await deletePromise(id)
    await invalidate()
    void load()
    showToast(t("mod.promises.removed"))
  }

  const dismissReport = async (id: string) => {
    await deleteReport(id)
    void load()
  }

  const banAuthor = async (report: Report) => {
    const owner = promises.find((x) => x.id === report.promise_id)?.user_id
    if (!owner) {
      showToast(t("mod.noOwner"))
      return
    }
    await setUserBanned(owner, true)
    showToast(t("mod.bannedToast"))
    void load()
  }

  const toggleBan = async (u: Profile) => {
    await setUserBanned(u.id, !u.banned)
    showToast(u.banned ? t("mod.unbannedToast") : t("mod.bannedToast"))
    void load()
  }

  const save = async () => {
    await saveSettings({
      templates: templates.split("\n").map((s) => s.trim()).filter(Boolean),
      quotes: quotes.split("\n").map((s) => s.trim()).filter(Boolean),
      categories,
      rateLimit: Math.max(1, rateLimit),
    })
    setStoreCategories(categories)
    showToast(t("mod.set.saved"))
  }

  const doReset = async () => {
    if (!window.confirm(t("mod.resetConfirm"))) return
    await resetWall()
    await invalidate()
    showToast(t("mod.resetDone"))
  }

  const addCategory = () => setCategories([...categories, { key: "", en: "", zh: "", icon: "" }])
  const setCat = (i: number, patch: Partial<Category>) =>
    setCategories(categories.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const removeCat = (i: number) => setCategories(categories.filter((_, idx) => idx !== i))

  return (
    <div className="overlay" onClick={() => setModOpen(false)}>
      <div className="mod" onClick={(e) => e.stopPropagation()}>
        <div className="av-head">
          <h2>{t("mod.title")}</h2>
          <button className="close" onClick={() => setModOpen(false)} aria-label="Close">
            ×
          </button>
        </div>
        <div className="mod-tabs">
          <button className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}>
            {t("mod.tab.reports")}
          </button>
          <button className={tab === "promises" ? "on" : ""} onClick={() => setTab("promises")}>
            {t("mod.tab.promises")}
          </button>
          <button className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>
            {t("mod.tab.users")}
          </button>
          <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>
            {t("mod.tab.settings")}
          </button>
        </div>

        {tab === "reports" && (
          <div className="mod-body">
            {reports.length === 0 ? (
              <div className="mod-empty">{t("mod.empty")}</div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="mod-row">
                  <div className="mod-main">
                    <div className="mod-text">{r.text}</div>
                    <div className="mod-meta">
                      {r.author} · {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="mod-actions">
                    <button className="pill" onClick={() => void removePromise(r.promise_id)}>
                      {t("mod.remove")}
                    </button>
                    <button className="pill" onClick={() => void banAuthor(r)}>
                      {t("mod.ban")}
                    </button>
                    <button className="pill" onClick={() => void dismissReport(r.id)}>
                      {t("mod.dismiss")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "promises" && (
          <div className="mod-body">
            {promises.length === 0 ? (
              <div className="mod-empty">{t("mod.promises.empty")}</div>
            ) : (
              promises.map((p) => (
                <div key={p.id} className="mod-row">
                  <div className="mod-main">
                    <div className="mod-text">{p.text}</div>
                    <div className="mod-meta">{p.author}</div>
                  </div>
                  <div className="mod-actions">
                    <button className="pill danger" onClick={() => void removePromise(p.id)}>
                      {t("mod.remove")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "users" && (
          <div className="mod-body">
            {profiles.length === 0 ? (
              <div className="mod-empty">{t("mod.empty")}</div>
            ) : (
              profiles.map((u) => (
                <div key={u.id} className="mod-row">
                  <div className="mod-main">
                    <div className="mod-text">
                      {u.name || u.id}
                      {u.is_admin ? " ★" : ""}
                    </div>
                  </div>
                  <div className="mod-actions">
                    <button className={`pill ${u.banned ? "" : "danger"}`} onClick={() => void toggleBan(u)}>
                      {u.banned ? t("mod.unban") : t("mod.ban")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="mod-body">
            <label>{t("mod.set.templates")}</label>
            <textarea value={templates} onChange={(e) => setTemplates(e.target.value)} rows={4} />
            <label>{t("mod.set.quotes")}</label>
            <textarea value={quotes} onChange={(e) => setQuotes(e.target.value)} rows={4} />
            <label>{t("mod.set.categories")}</label>
            <div className="cat-rows">
              {categories.map((c, i) => (
                <div key={i} className="cat-row">
                  <input className="c-icon" value={c.icon ?? ""} onChange={(e) => setCat(i, { icon: e.target.value })} placeholder="icon" />
                  <input className="c-key" value={c.key} onChange={(e) => setCat(i, { key: e.target.value })} placeholder="key" />
                  <input value={c.en} onChange={(e) => setCat(i, { en: e.target.value })} placeholder="EN" />
                  <input value={c.zh} onChange={(e) => setCat(i, { zh: e.target.value })} placeholder="中文" />
                  <button className="x" onClick={() => removeCat(i)} aria-label="Remove">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="pill" onClick={addCategory}>
              {t("mod.set.addCat")}
            </button>
            <label>{t("mod.set.rateLimit")}</label>
            <input
              className="num"
              type="number"
              min={1}
              value={rateLimit}
              onChange={(e) => setRateLimit(parseInt(e.target.value, 10) || 1)}
            />
            <div className="mod-actions">
              <button className="pill primary" onClick={() => void save()}>
                {t("mod.set.save")}
              </button>
              <button className="pill danger" onClick={() => void doReset()}>
                {t("mod.set.resetWall")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
