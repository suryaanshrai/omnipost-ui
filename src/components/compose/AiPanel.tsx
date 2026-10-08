import type { Dispatch, SetStateAction } from "react"
import type { Channel, MediaAsset, PostKind } from "@/types/api"

export interface AiPanelProps {
  text: string
  onText: (text: string) => void
  channels: Channel[]
  overrides: Record<number, string>
  onOverrides: Dispatch<SetStateAction<Record<number, string>>>
  media: MediaAsset[]
  onMedia: Dispatch<SetStateAction<MediaAsset[]>>
  kind: PostKind
}

/** "Draft with AI" — filled in with the AI composer (Phase G). */
export default function AiPanel(_props: AiPanelProps) {
  return null
}
