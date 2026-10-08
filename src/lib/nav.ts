import { useWorkspace } from "@/lib/workspace"

export interface NavItem {
  to: string
  label: string
  end?: boolean
}

/** The sidebar's sections in order. Approvals slots in after Drafts only while the workspace's workflow is on. */
export function navItems(approvals: boolean): NavItem[] {
  return [
    { to: "/app", label: "Posts", end: true },
    { to: "/app/drafts", label: "Drafts" },
    ...(approvals ? [{ to: "/app/approvals", label: "Approvals" }] : []),
    { to: "/app/calendar", label: "Calendar" },
    { to: "/app/connections", label: "Connections" },
    { to: "/app/analytics", label: "Analytics" },
    { to: "/app/settings", label: "Settings" },
  ]
}

/** "03 · Schedule" — a page eyebrow numbered the same as its sidebar row, which shifts when Approvals appears. */
export function useSectionEyebrow(to: string, word: string): string {
  const { activeWorkspace } = useWorkspace()
  const index = navItems(!!activeWorkspace.approval_workflow_enabled).findIndex((item) => item.to === to)
  return index < 0 ? word : `${String(index + 1).padStart(2, "0")} · ${word}`
}
