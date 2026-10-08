import type { Post, PostTargetWrite } from "@/types/api"

/** A scheduled post whose hour has come — it's being (or about to be) dispatched. */
export function isDue(post: Pick<Post, "scheduled_for">, slackMs = 60_000): boolean {
  return !post.scheduled_for || new Date(post.scheduled_for).getTime() <= Date.now() + slackMs
}

/**
 * The replace-all `target_specs` for a post retargeted to `channelIds`.
 * PATCHing target_specs deletes and recreates every target, so a channel
 * that stays selected must carry its existing per-channel shaping
 * (format, text_override, media) along — otherwise toggling an unrelated
 * chip would silently wipe an AI-written variant on this one.
 */
export function targetSpecsFor(
  post: Pick<Post, "targets">,
  channelIds: number[],
  overrides?: Record<number, string>
): PostTargetWrite[] {
  const existing = new Map(post.targets.map((t) => [t.channel, t]))
  return channelIds.map((channel) => {
    const prev = existing.get(channel)
    const spec: PostTargetWrite = { channel }
    if (prev?.format) spec.format = prev.format
    if (prev?.media?.length) spec.media = prev.media
    const text = overrides && channel in overrides ? overrides[channel] : prev?.text_override
    if (text) spec.text_override = text
    return spec
  })
}
