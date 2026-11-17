import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import Wordmark from "@/components/editorial/Wordmark"
import { apiFetch, ApiError } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import type { BioPage as BioPageData } from "@/types/api"

type BioLink = { label: string; url: string }
type BioPost = { text: string; url: string; published_at: string | null }

/** Only http(s) links are ever rendered, whatever the API sends. */
function safeHref(url: unknown): string | null {
  try {
    const parsed = new URL(String(url))
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null
  } catch {
    return null
  }
}

/** /bio/:slug: a workspace's public link-in-bio page. */
export default function BioPage() {
  const { slug = "" } = useParams()
  const page = useQuery({
    queryKey: ["bio", slug],
    queryFn: () => apiFetch<BioPageData>(`/public/bio/${encodeURIComponent(slug)}/`, { anonymous: true }),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  })

  useEffect(() => {
    if (page.data) document.title = page.data.name
  }, [page.data])

  if (page.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <span className="eyebrow">Loading…</span>
      </div>
    )
  }
  if (page.isError || !page.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page px-4 text-center text-ink">
        <h1 className="display text-[44px]">Nothing here</h1>
        <p className="text-ink-55">This page doesn't exist or isn't public.</p>
      </div>
    )
  }

  const data = page.data
  const links = (data.links as BioLink[]).filter((l) => safeHref(l.url))
  const posts = (data.posts as BioPost[]).filter((p) => safeHref(p.url))

  return (
    <div className="min-h-screen bg-page px-4 py-12 text-ink sm:py-20">
      <main className="mx-auto flex max-w-[520px] flex-col">
        <h1 className="display text-center text-[clamp(40px,9vw,64px)] leading-[1]">{data.name}</h1>
        {data.description && (
          <p className="mt-5 text-center text-[16px] leading-[1.6] text-pretty text-ink-55">{data.description}</p>
        )}
        {links.length > 0 && (
          <ul className="mt-10 flex flex-col gap-3">
            {links.map((l, i) => (
              <li key={i}>
                <a
                  href={safeHref(l.url)!}
                  rel="noopener noreferrer nofollow"
                  className="block border border-ink px-5 py-4 text-center text-[13px] font-bold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-page"
                >
                  {l.label || new URL(l.url).hostname}
                </a>
              </li>
            ))}
          </ul>
        )}
        {posts.length > 0 && (
          <section className="mt-14">
            <h2 className="eyebrow border-b border-hair pb-3">Latest</h2>
            <ul>
              {posts.map((p, i) => (
                <li key={i} className="border-b border-hair">
                  <a href={safeHref(p.url)!} rel="noopener noreferrer nofollow" className="block py-4 hover:text-rust">
                    <span className="line-clamp-3 text-[15px] leading-[1.55]">{p.text}</span>
                    {p.published_at && <span className="eyebrow mt-2 block">{formatStamp(p.published_at)}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <Link to="/" className="mt-16 self-center opacity-60 transition-opacity hover:opacity-100" aria-label="Made with OmniPost">
          <Wordmark />
        </Link>
      </main>
    </div>
  )
}
