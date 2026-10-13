import { useEffect, useLayoutEffect, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { SelectField } from "@/components/editorial/Field"
import Wordmark from "@/components/editorial/Wordmark"
import Beam from "@/components/fx/Beam"
import LiquidIndicator from "@/components/fx/LiquidIndicator"
import Orb from "@/components/fx/Orb"
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
  const location = useLocation()

  const approvals = !!activeWorkspace.approval_workflow_enabled
  const drafts = usePostCount("draft")
  const inReview = usePostCount("in_review", approvals)

  const badges: Record<string, number | undefined> = {
    "/app/drafts": drafts.data,
    "/app/approvals": inReview.data,
  }
  const items = navItems(approvals).map((item) => ({ ...item, badge: badges[item.to] }))

  const username = me.data?.username ?? ""

  // The liquid marker in the nav gutter follows whichever row NavLink marks
  // active; the Day/Night thumb follows the current theme's segment.
  const [nav, setNav] = useState<HTMLElement | null>(null)
  const [activeRow, setActiveRow] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    setActiveRow(nav?.querySelector<HTMLElement>('[aria-current="page"]') ?? null)
  }, [nav, location.pathname, items.length])
  const [themeSwitch, setThemeSwitch] = useState<HTMLElement | null>(null)
  const [themeSegment, setThemeSegment] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    setThemeSegment(themeSwitch?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? null)
  }, [themeSwitch, theme])

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

      <Beam size="md" surface="ink" strength={0.75} duration={3.2} className="mt-8">
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            openCompose()
          }}
          className="flex w-full items-center justify-between bg-ink px-5 py-[15px] text-[11px] font-bold tracking-[0.18em] text-page uppercase transition-colors duration-300 hover:bg-rust"
        >
          Compose <span className="text-[15px] leading-none">+</span>
        </button>
      </Beam>

      <nav ref={setNav} aria-label="Primary" className="relative mt-8 border-t border-hair">
        <LiquidIndicator
          container={nav}
          target={activeRow}
          shape={(r) => ({ x: -17, y: r.y + 12, w: 7, h: r.h - 24 })}
          blur={3}
        />
        {items.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className="group relative z-10 grid grid-cols-[26px_1fr_auto] items-center border-b border-hair px-0.5 py-[15px]"
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
          <span aria-hidden="true" className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <Orb state="breathing" size={32} className="absolute inset-0" />
            <span className="relative text-[12px] font-bold text-rust uppercase">{username.slice(0, 1) || "·"}</span>
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

        <div
          ref={setThemeSwitch}
          role="group"
          aria-label="Theme"
          className="relative mt-5 grid grid-cols-2 border border-hair"
        >
          <LiquidIndicator
            container={themeSwitch}
            target={themeSegment}
            fill="var(--ink)"
            shape={(r) => ({ x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - 6 })}
          />
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
              onClick={() => setTheme(t)}
              className={cn(
                "relative z-10 py-2.5 text-[10px] font-bold tracking-[0.16em] uppercase transition-colors duration-300",
                theme === t ? "text-page" : "text-ink-55 hover:text-rust"
              )}
            >
              {t === "light" ? "Day" : "Night"}
            </button>
          ))}
        </div>

        <div className="mt-2">
          <button
            type="button"
            onClick={exit}
            className="w-full border border-hair py-2.5 text-[10px] font-bold tracking-[0.16em] text-ink uppercase transition-colors hover:border-rust hover:text-rust"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}
