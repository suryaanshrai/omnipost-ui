import { useEffect, useId, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Modal from "@/components/editorial/Modal"
import { TextButton } from "@/components/editorial/Buttons"
import { apiFetch, type Page } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/api"

/** Failed posts and broken channels: an unread count, and the list on click. */
// Native popovers: Chrome 116, Firefox 125, Safari 17. Older browsers get the
// same panel as a centred modal, which is how this worked before.
const supportsPopover = typeof HTMLElement !== "undefined" && Object.hasOwn(HTMLElement.prototype, "popover")

/**
 * Failed posts and broken channels: an unread count, and the list on click.
 * The list opens as a popover panel tethered under the button (modern-web-
 * guidance `dialog` rule 2 and `viewport-aware-dropdowns`): the page stays
 * usable, a click elsewhere or Escape closes it. Where CSS anchor
 * positioning isn't supported the panel sits centred in the viewport.
 */
export default function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const panelRef = useRef<HTMLDialogElement>(null)
  const id = useId()
  const panelId = `alerts-${id}`
  const titleId = `alerts-title-${id}`
  const anchor = `--alerts-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`

  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => apiFetch<{ unread: number }>("/notifications/unread-count/"),
    refetchInterval: 60_000,
    select: (d) => d.unread,
  })
  const list = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => apiFetch<Page<Notification>>("/notifications/?limit=30"),
    enabled: open,
  })
  const markRead = useMutation({
    mutationFn: (id: number | "all") =>
      apiFetch(id === "all" ? "/notifications/read-all/" : `/notifications/${id}/read/`, { method: "POST" }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  // The popover opens and closes itself (button, Escape, click outside);
  // mirror that into state so the list loads only while it's showing.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const onToggle = (e: Event) => setOpen((e as ToggleEvent).newState === "open")
    panel.addEventListener("toggle", onToggle)
    return () => panel.removeEventListener("toggle", onToggle)
  }, [])

  const count = unread.data ?? 0
  const items = list.data?.results ?? []

  const close = () => {
    if (supportsPopover) panelRef.current?.hidePopover()
    else setOpen(false)
  }

  const footer = (
    <>
      <span className="eyebrow">{count ? `${count} unread` : "All caught up"}</span>
      {count > 0 && <TextButton onClick={() => markRead.mutate("all")}>Mark all read</TextButton>}
    </>
  )

  const body = list.isLoading ? (
    <p className="eyebrow">Loading…</p>
  ) : items.length === 0 ? (
    <p className="text-[14.5px] text-ink-55">
      Nothing yet. If a post fails or an account needs reconnecting, it shows up here and in your email.
    </p>
  ) : (
    <ul className="border-t border-hair">
      {items.map((n) => (
        <li key={n.id} className="border-b border-hair">
          <button
            type="button"
            onClick={() => {
              if (!n.read_at) markRead.mutate(n.id)
              close()
              if (n.link) void navigate(n.link)
            }}
            className="block w-full py-4 text-left hover:bg-ink/[.03]"
          >
            {/* Spans only: a button may hold phrasing content, not <div>/<p>. */}
            <span className="flex items-center gap-2">
              {!n.read_at && (
                <span role="img" aria-label="Unread" className="h-[6px] w-[6px] shrink-0 rounded-full bg-rust" />
              )}
              <span className="text-[14px] font-semibold text-ink">{n.title}</span>
            </span>
            {n.body && (
              <span className="user-text mt-1 line-clamp-3 block text-[13px] leading-[1.5] text-ink-55">{n.body}</span>
            )}
            <time dateTime={n.created_at} className="eyebrow mt-1.5 block">
              {formatStamp(n.created_at)}
            </time>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <button
        type="button"
        {...(supportsPopover ? { popoverTarget: panelId } : { onClick: () => setOpen(true) })}
        aria-label={count ? `Alerts, ${count} unread` : "Alerts"}
        className={cn(
          "flex items-center gap-2 border border-hair px-3 py-2 text-[10px] font-bold tracking-[0.16em] uppercase transition-colors hover:border-rust hover:text-rust",
          className
        )}
        style={{ anchorName: anchor }}
      >
        Alerts
        {count > 0 && (
          <span aria-hidden="true" className="min-w-[18px] bg-rust px-1 text-center text-[9.5px] text-page">
            {count}
          </span>
        )}
      </button>

      {supportsPopover ? (
        <dialog
          ref={panelRef}
          id={panelId}
          popover="auto"
          aria-labelledby={titleId}
          className="alerts-panel w-[min(400px,calc(100vw-32px))] border border-hair bg-page p-0 text-ink"
          style={{ positionAnchor: anchor }}
        >
          <div className="max-h-[min(70dvh,560px)] overflow-y-auto overscroll-contain px-6 pt-6 pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow mb-2">Alerts</div>
                <h2 id={titleId} className="display text-[28px] leading-[1.05]">
                  What needs you
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="-mr-2 px-2 py-2 text-[10px] font-bold tracking-[0.16em] text-ink-55 uppercase hover:text-rust"
              >
                Close
              </button>
            </div>
            <div className="mt-5">{body}</div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-hair px-6 py-4">{footer}</div>
        </dialog>
      ) : (
        <Modal open={open} onOpenChange={setOpen} eyebrow="Alerts" title="What needs you" footer={footer}>
          {body}
        </Modal>
      )}
    </>
  )
}
