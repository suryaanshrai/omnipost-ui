import GeneratingImage from "@/components/fx/GeneratingImage"
import { useMediaAsset } from "@/lib/queries"
import { mediaUrl } from "@/lib/media"
import { cn } from "@/lib/utils"

/** The optional 220px media band on a post/draft entry — the first attached asset. */
export default function MediaBand({ mediaId, className }: { mediaId: number | undefined; className?: string }) {
  const { data } = useMediaAsset(mediaId)
  if (mediaId == null) return null
  const src = mediaUrl(data?.file)
  const isVideo = data?.kind === "video" || data?.mime_type?.startsWith("video/")

  return (
    <div className={cn("h-[220px] w-full max-w-[600px] overflow-hidden border border-hair bg-ink/[.04]", className)}>
      {data &&
        (isVideo ? (
          <video src={src} className="h-full w-full object-cover" muted playsInline controls preload="metadata" />
        ) : (
          // The picture develops out of img-fx's mosaic instead of popping in.
          <div role={data.alt_text ? "img" : undefined} aria-label={data.alt_text || undefined} className="h-full w-full">
            <GeneratingImage src={src} preset="pixels-organic" className="h-full w-full" />
          </div>
        ))}
    </div>
  )
}
