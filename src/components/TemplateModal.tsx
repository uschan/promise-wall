import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"

export function TemplateModal() {
  const t = useT()
  const open = useAppStore((s) => s.templateOpen)
  const setTemplateOpen = useAppStore((s) => s.setTemplateOpen)
  const setDraftText = useAppStore((s) => s.setDraftText)
  const openCreate = useAppStore((s) => s.openCreate)
  const templates = useAppStore((s) => s.templates) ?? []

  const pick = (tpl: string) => {
    setDraftText(tpl)
    setTemplateOpen(false)
    openCreate()
  }

  return (
    <div
      id="templateWrap"
      className={open ? "open" : ""}
      role="dialog"
      aria-modal="true"
      onClick={() => setTemplateOpen(false)}
    >
      <div id="templateBox" onClick={(e) => e.stopPropagation()}>
        <div className="av-head">
          <h2>{t("template.title")}</h2>
          <button aria-label="Close" onClick={() => setTemplateOpen(false)}>
            ×
          </button>
        </div>
        <p className="sub">{t("template.hint")}</p>
        <div id="templateList">
          {templates.length === 0 ? (
            <div className="mod-empty">{t("mod.empty")}</div>
          ) : (
            templates.map((tpl, i) => (
              <button key={i} className="tpl-item" onClick={() => pick(tpl)}>
                {tpl}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
