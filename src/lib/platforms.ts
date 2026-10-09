// One place for the per-platform colour language: the 5px dot on a channel
// chip, the faint row tint on a Connections/landing platform row. The
// design only specifies three (Instagram rust, Facebook #1877F2, LinkedIn
// #0A66C2); the other eight connectors the backend grew get their own
// brand-adjacent hue in the same register, so a chip is always identifiable
// at a glance without a logo.
const PLATFORM_HUES: Record<string, string> = {
  instagram: "#C4501E",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  threads: "#6B635A",
  x: "#3A3632",
  bluesky: "#1185FE",
  mastodon: "#6364FF",
  discord: "#5865F2",
  telegram: "#229ED9",
  tiktok: "#EE1D52",
  youtube: "#FF0033",
}

const FALLBACK_HUE = "#8A8178"

export function platformHue(slug: string): string {
  return PLATFORM_HUES[slug] ?? FALLBACK_HUE
}

/** The same hue at .09 alpha — the design's row-hover tint. */
export function platformTint(slug: string, alpha = 0.09): string {
  const hex = platformHue(slug).slice(1)
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * The public landing page's platform list. Hardcoded rather than read from
 * GET /connectors/ because that endpoint requires auth and the landing page
 * is anonymous — keep it in step with omnipost-api's connectors/platforms
 * and connectors/specs when a connector is added.
 */
export const LANDING_PLATFORMS: { slug: string; name: string; description: string; formats: string[] }[] = [
  { slug: "instagram", name: "Instagram", description: "Feed images, video, Reels and Stories through the Graph API.", formats: ["image", "video", "short video", "story"] },
  { slug: "facebook", name: "Facebook", description: "Page posts with text, links, images and video.", formats: ["text", "image", "video"] },
  { slug: "linkedin", name: "LinkedIn", description: "Member posts on your own registered LinkedIn app.", formats: ["text", "image", "video"] },
  { slug: "x", name: "X", description: "Posts and threads on your own X developer app.", formats: ["text", "image", "video"] },
  { slug: "threads", name: "Threads", description: "Text, image and video posts through Meta's Threads API.", formats: ["text", "image", "video"] },
  { slug: "bluesky", name: "Bluesky", description: "Posts with alt text over the AT Protocol, signed in with an app password.", formats: ["text", "image"] },
  { slug: "mastodon", name: "Mastodon", description: "Posts to any instance you sign in to.", formats: ["text"] },
  { slug: "tiktok", name: "TikTok", description: "Short vertical video through the Content Posting API.", formats: ["short video"] },
  { slug: "youtube", name: "YouTube", description: "Shorts uploaded through the Data API.", formats: ["short video"] },
  { slug: "discord", name: "Discord", description: "Messages to a channel through its webhook.", formats: ["text"] },
  { slug: "telegram", name: "Telegram", description: "Messages to a channel or group through your bot.", formats: ["text"] },
]
