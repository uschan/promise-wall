import type { PaperKind } from "./types"

export type PaperStyle = {
  label: string
  base: string
  ink: string
  torn: boolean
  lines: "none" | "ruled" | "grid" | "staff"
  grain: number
  spiral?: boolean
  rough?: boolean
  burnt?: boolean
  frame?: "postcard" | "polaroid"
  tape?: boolean
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
    spiral: true,
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
    label: "Handmade",
    base: "#efe9dd",
    ink: "#443d31",
    torn: true,
    lines: "none",
    grain: 0.13,
    rough: true,
  },
  parchment: {
    label: "Parchment",
    base: "#e6d3a3",
    ink: "#4a3a1e",
    torn: true,
    lines: "none",
    grain: 0.18,
    rough: true,
    burnt: true,
  },
  postcard: {
    label: "Postcard",
    base: "#f5eddb",
    ink: "#35566e",
    torn: false,
    lines: "none",
    grain: 0.05,
    frame: "postcard",
  },
  polaroid: {
    label: "Polaroid",
    base: "#fcfbf7",
    ink: "#4a4234",
    torn: false,
    lines: "none",
    grain: 0.03,
    frame: "polaroid",
  },
  sticky: {
    label: "Sticky Note",
    base: "#ffe98a",
    ink: "#6b5216",
    torn: false,
    lines: "none",
    grain: 0.04,
    tape: true,
  },
  staff: {
    label: "Music",
    base: "#f7f3e9",
    ink: "#403a48",
    torn: false,
    lines: "staff",
    grain: 0.05,
  },
  dark: {
    label: "Charcoal",
    base: "#2c2c31",
    ink: "#f5f3ee",
    torn: false,
    lines: "none",
    grain: 0.06,
  },
}
