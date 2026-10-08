import { useEffect, useState } from "react"
import { NavLink, useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { SelectField } from "@/components/editorial/Field"
import Wordmark from "@/components/editorial/Wordmark"
import { useCompose } from "@/components/compose/compose-context"
import { useTheme } from "@/components/theme-provider"
import useAuthContext from "@/contexts/authContext"
import { apiFetch, setToken } from "@/lib/api"
import { navItems } from "@/lib/nav"
import { useMe, usePostCount } from "@/lib/queries"
import { formatClock } from "@/lib/format"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    // Tick on the minute boundary rather than every second — the clock only shows minutes.
    let interval: number | undefined
    const timeout = window.setTimeout(() => {
      setNow(new Date())
      interval = window.setInterval(() => setNow(new Date()), 60_000)
    }, 60_000 - (Date.now() % 60_000))
    return () => {
      window.clearTimeout(timeout)
      if (interval) window.clearInterval(interval)
    }
  }, [])
  return now
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace()
  const { openCompose } = useCompose()
  const { theme, setTheme } = useTheme()
  const { updateToken, toggleSignedIn, updateUser } = useAuthContext()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const now = useClock()
  const me = useMe()

  const approvals = !!activeWorkspace.approval_workflow_enabled
  const drafts = usePostCount("draft")
  const inReview = usePostCount("in_review", approvals)

  const badges: Record<string, number | undefined> = {
    "/app/drafts": drafts.data,
    "/app/approvals": inReview.data,
  }
  const items = navItems(approvals).map((item) => ({ ...item, badge: badges[item.to] }))

  const username = me.data?.username ?? ""

  const exit = () => {
    // Best-effort server-side token revoke; the local sign-out happens regardless.
    apiFetch("/auth/logout/", { method: "POST" }).catch(() => {})
    setToken(null)
    queryClient.clear()
    updateToken("")
    updateUser("")
    toggleSignedIn(false)
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex h-full flex-col px-6 pt-7 pb-6">
      <Wordmark size={21} />

      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          openCompose()
        }}
        className="mt-8 flex w-full items-center justify-between bg-ink px-5 py-[15px] text-[11px] font-bold tracking-[0.18em] text-page uppercase transition-colors duration-300 hover:bg-rust"
      >
        Compose <span className="text-[15px] leading-none">+</span>
      </button>

      <nav aria-label="Primary" className="mt-8 border-t border-hair">
        {items.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className="group grid grid-cols-[26px_1fr_auto] items-center border-b border-hair px-0.5 py-[15px]"
          >
            {({ isActive }) => (
              <>
                <span className={cn("font-display text-[15px] leading-none", isActive ? "text-rust" : "text-ink-38")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "text-[12px] font-bold tracking-[0.14em] uppercase transition-[color,transform] duration-300 group-hover:translate-x-1",
                    isActive ? "text-ink" : "text-ink-55 group-hover:text-ink"
                  )}
                >
                  {item.label}
                </span>
                {!!item.badge && (
                  <span className="min-w-[20px] bg-rust px-1.5 py-0.5 text-center text-[9.5px] font-bold text-page">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="border-t border-hair pt-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-rust text-[12px] font-bold text-page uppercase"
          >
            {username.slice(0, 1) || "·"}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-ink">{username || " "}</div>
            <div className="eyebrow mt-0.5" aria-label="Current time">
              {formatClock(now)}
            </div>
          </div>
        </div>

        {workspaces.length > 1 && (
          <SelectField
            label="Workspace"
            className="mt-5"
            value={activeWorkspace.id}
            onChange={(e) => {
              setActiveWorkspaceId(Number(e.target.value))
              onNavigate?.()
            }}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </SelectField>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-label={theme === "dark" ? "Switch to Day" : "Switch to Night"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="border border-hair py-2.5 text-[10px] font-bold tracking-[0.16em] text-ink uppercase transition-colors hover:border-rust hover:text-rust"
          >
            {theme === "dark" ? "Day" : "Night"}
          </button>
          <button
            type="button"
            onClick={exit}
            className="border border-hair py-2.5 text-[10px] font-bold tracking-[0.16em] text-ink uppercase transition-colors hover:border-rust hover:text-rust"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}
