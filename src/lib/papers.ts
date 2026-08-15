import type { PaperKind } from "./types"

export type PaperStyle = {
  label: string
  base: string
  ink: string
  torn: boolean
  lines: "none" | "ruled" | "grid"
  grain: number
}

export const PAPERS: Record<PaperKind, PaperStyle> = {
  classic: {
    label: "Classic",
    base: "#f4eddc",
    ink: "#4a4234",
    torn: true,
    lines: "none",
    grain: 0.1,
  },
  notebook: {
    label: "Notebook",
    base: "#f7f3e8",
    ink: "#44507a",
    torn: false,
    lines: "ruled",
    grain: 0.06,
  },
  graph: {
    label: "Graph",
    base: "#f6f4ec",
    ink: "#3f4a41",
    torn: false,
    lines: "grid",
    grain: 0.05,
  },
  pastelPink: {
    label: "Blush",
    base: "#ecd3cd",
    ink: "#5c4038",
    torn: true,
    lines: "none",
    grain: 0.09,
  },
  pastelPurple: {
    label: "Lilac",
    base: "#cfc6e0",
    ink: "#453d5c",
    torn: false,
    lines: "none",
    grain: 0.08,
  },
  pastelGreen: {
    label: "Sage",
    base: "#cfd3bd",
    ink: "#3f4632",
    torn: false,
    lines: "none",
    grain: 0.09,
  },
  kraft: {
    label: "Kraft",
    base: "#c9a878",
    ink: "#46351f",
    torn: true,
    lines: "none",
    grain: 0.16,
  },
  torn: {
    label: "Torn",
    base: "#e6d9c2",
    ink: "#3f352a",
    torn: true,
    lines: "none",
    grain: 0.14,
  },
}
