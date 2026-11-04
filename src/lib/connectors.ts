import type { ChannelHealth, Connector } from "@/types/api"

const FIELD_LABELS: Record<string, string> = {
  IDENTIFIER: "Handle",
  APP_PASSWORD: "App password",
  WEBHOOK_URL: "Webhook URL",
  BOT_TOKEN: "Bot token",
  CHAT_ID: "Chat ID",
  ACCESS_TOKEN: "Access token",
  INSTANCE_DOMAIN: "Instance domain",
  instance_domain: "Instance domain",
}

const FIELD_HINTS: Record<string, string> = {
  IDENTIFIER: "Your Bluesky handle, e.g. you.bsky.social.",
  APP_PASSWORD: "Create one under Settings → App passwords. Never your main password.",
  WEBHOOK_URL: "Channel settings → Integrations → Webhooks → Copy webhook URL.",
  BOT_TOKEN: "From @BotFather after creating your bot.",
  CHAT_ID: "The channel or group id the bot posts to, e.g. -1001234567890 or @yourchannel.",
  INSTANCE_DOMAIN: "Just the domain, e.g. mastodon.social.",
  instance_domain: "Just the domain, e.g. mastodon.social.",
  ACCESS_TOKEN: "Preferences → Development → New application, with write:statuses.",
}

const SECRET_FIELDS = new Set(["APP_PASSWORD", "BOT_TOKEN", "ACCESS_TOKEN", "WEBHOOK_URL"])

export function fieldLabel(name: string): string {
  return FIELD_LABELS[name] ?? name.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
}

export function fieldHint(name: string): string | undefined {
  return FIELD_HINTS[name]
}

export function isSecretField(name: string): boolean {
  return SECRET_FIELDS.has(name)
}

const KIND_WORDS: Record<string, string> = {
  text: "text",
  image: "image",
  video: "video",
  short_video: "short video",
  story: "story",
}

/** One line describing what a connector publishes and how it signs in. */
export function connectorSummary(c: Connector): string {
  const kinds = c.post_kinds.map((k) => KIND_WORDS[k] ?? k)
  const how = c.supports_oauth
    ? c.requires_own_app
      ? "Sign in through your own registered app"
      : "Sign in with the platform"
    : "Connect with credentials"
  return `${kinds.join(", ").replace(/^./, (ch) => ch.toUpperCase())}. ${how}${
    c.supports_oauth && c.credential_fields.length ? ", or paste credentials" : ""
  }.`
}

/** Where the OAuth round trip parks what the callback page needs. */
export const OAUTH_STASH_KEY = "omniOAuthPending"

export interface OAuthStash {
  connector_slug: string
  redirect_uri: string
}

export function oauthRedirectUri(): string {
  return `${window.location.origin}/oauth/callback`
}

/** A 400 from /oauth/start/ caused by a missing own-app credential (MissingAppCredential). */
export function isMissingAppCredential(detail: string): boolean {
  return /register your own/i.test(detail)
}

const HEALTH_LABELS: Record<ChannelHealth, string> = {
  healthy: "Healthy",
  needs_attention: "Needs attention",
  broken: "Broken",
}

export function healthLabel(health: ChannelHealth): string {
  return HEALTH_LABELS[health]
}
