import { useState } from "react"
import { useNavigate } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Modal from "@/components/editorial/Modal"
import { TextButton } from "@/components/editorial/Buttons"
import { apiFetch, type Page } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/api"

/** Failed posts and broken channels: an unread count, and the list on click. */
export default function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  const count = unread.data ?? 0
  const items = list.data?.results ?? []

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={count ? `Alerts, ${count} unread` : "Alerts"}
        className={cn(
          "flex items-center gap-2 border border-hair px-3 py-2 text-[10px] font-bold tracking-[0.16em] uppercase transition-colors hover:border-rust hover:text-rust",
          className
        )}
      >
        Alerts
        {count > 0 && <span className="min-w-[18px] bg-rust px-1 text-center text-[9.5px] text-page">{count}</span>}
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        eyebrow="Alerts"
        title="What needs you"
        footer={
          <>
            <span className="eyebrow">{count ? `${count} unread` : "All caught up"}</span>
            {count > 0 && (
              <TextButton type="button" onClick={() => markRead.mutate("all")}>
                Mark all read
              </TextButton>
            )}
          </>
        }
      >
        {list.isLoading ? (
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
                    setOpen(false)
                    if (n.link) navigate(n.link)
                  }}
                  className="block w-full py-4 text-left hover:bg-ink/[.03]"
                >
                  <div className="flex items-center gap-2">
                    {!n.read_at && <span aria-label="Unread" className="h-[6px] w-[6px] shrink-0 rounded-full bg-rust" />}
                    <span className="text-[14px] font-semibold text-ink">{n.title}</span>
                  </div>
                  {n.body && (
                    <p className="mt-1 line-clamp-3 text-[13px] leading-[1.5] whitespace-pre-line text-ink-55">{n.body}</p>
                  )}
                  <span className="eyebrow mt-1.5 block">{formatStamp(n.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  )
}
