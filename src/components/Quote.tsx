import { useEffect, useState } from "react"
import { useAppStore } from "../store/useAppStore"

const DEFAULT_QUOTES = [
  "Small promises, lasting change.",
  "The future you is shaped by every promise you keep today.",
]

export function Quote() {
  const quotes = useAppStore((s) => s.quotes)
  const list = quotes && quotes.length > 0 ? quotes : DEFAULT_QUOTES
  const [i, setI] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setI((v) => (v + 1) % list.length), 8000)
    return () => clearInterval(timer)
  }, [list.length])

  return <div className="quote">{list[i] ?? list[0] ?? ""}</div>
}
