import conf from "@/conf"

/**
 * MediaAsset.file is a storage-relative path ("/media/…" or "media/…")
 * with local storage and an absolute URL with S3 — prefix the former
 * with the API origin so it resolves against the API, not the UI host.
 */
export function mediaUrl(file: string | null | undefined): string {
  if (!file) return ""
  if (/^https?:\/\//.test(file)) return file
  return `${conf.api_url.replace(/\/$/, "")}/${file.replace(/^\//, "")}`
}
