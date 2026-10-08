import { createContext, useContext } from "react"
import type { Post, PostKind } from "@/types/api"

export interface ComposeContextValue {
  /** Open the compose modal: at step one with no kind, at step two with a kind, or in edit mode with a post. */
  openCompose: (options?: { kind?: PostKind; post?: Post }) => void
}

export const ComposeContext = createContext<ComposeContextValue>({ openCompose: () => {} })

export function useCompose() {
  return useContext(ComposeContext)
}

export const POST_KINDS: { kind: PostKind; label: string }[] = [
  { kind: "text", label: "Text" },
  { kind: "image", label: "Image" },
  { kind: "video", label: "Video" },
  { kind: "short_video", label: "Short video" },
  { kind: "story", label: "Story" },
]

export function kindLabel(kind: string | undefined): string {
  return POST_KINDS.find((k) => k.kind === kind)?.label ?? "Text"
}

export function isPostKind(value: string | null): value is PostKind {
  return !!value && POST_KINDS.some((k) => k.kind === value)
}
