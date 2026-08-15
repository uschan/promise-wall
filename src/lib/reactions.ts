import type { ReactionType } from "./types"
import type { I18nKey } from "../i18n"

export const REACTIONS: { type: ReactionType; emoji: string; label: I18nKey }[] = [
  { type: "heart", emoji: "❤️", label: "reaction.heart" },
  { type: "thumbs", emoji: "👍", label: "reaction.thumbs" },
  { type: "fire", emoji: "🔥", label: "reaction.fire" },
  { type: "smile", emoji: "😊", label: "reaction.smile" },
  { type: "muscle", emoji: "💪", label: "reaction.muscle" },
]
