import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch, ApiError, setToken, type Page } from "@/lib/api"
import { setDisplayTimeZone } from "@/lib/format"
import type { Workspace } from "@/types/api"
import { PrimaryButton } from "@/components/editorial/Buttons"
import Field from "@/components/editorial/Field"
import Wordmark from "@/components/editorial/Wordmark"

const ACTIVE_WORKSPACE_KEY = "omniActiveWorkspaceId"

interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspace: Workspace
  setActiveWorkspaceId: (id: number) => void
  createWorkspace: (name: string) => Promise<Workspace>
  isCreating: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

/** Read the active workspace. Throws outside a WorkspaceProvider — every
 * screen that calls this is expected to render under one (see App.tsx from
 * Phase D onward), the same assumption RequireAuth already makes about the
 * auth token. */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider")
  return ctx
}

/**
 * Resolves the signed-in user's active workspace and makes it available to
 * everything under it via useWorkspace(). Meant to wrap the authenticated
 * app shell specifically — it fetches on mount, so mounting it above the
 * router would fire an authenticated `/workspaces/` request for an
 * anonymous visitor to the public landing page, and 401 there before
 * they've ever seen a login screen.
 *
 * Deliberately does NOT auto-create a workspace when the list is empty.
 * WorkspaceViewSet.perform_create() creates a brand new Organization on
 * every call with no uniqueness guard — a write fired from a mount effect
 * would duplicate under React StrictMode's double-invoke in dev, or from
 * two open tabs racing each other. Zero workspaces instead renders an
 * explicit "create your workspace" prompt and waits for one real click.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<number | null>(() => {
    const stored = localStorage.getItem(ACTIVE_WORKSPACE_KEY)
    return stored ? Number(stored) : null
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => apiFetch<Page<Workspace>>("/workspaces/"),
  })
  const workspaces = useMemo(() => data?.results ?? [], [data])

  const setActiveWorkspaceId = (id: number) => {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, String(id))
    setActiveId(id)
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => apiFetch<Workspace>("/workspaces/", { method: "POST", body: { name } }),
    onSuccess: (workspace) => {
      queryClient.setQueryData<Page<Workspace>>(["workspaces"], (prev) =>
        prev ? { ...prev, count: prev.count + 1, results: [workspace, ...prev.results] } : prev
      )
      setActiveWorkspaceId(workspace.id)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.detail : "Could not create the workspace.")
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <span className="eyebrow">Loading your workspace…</span>
      </div>
    )
  }

  // A failed load is not "no workspaces": offering to create one here would
  // make an existing user a duplicate organization.
  if (isError) {
    return <WorkspaceLoadError onRetry={() => refetch()} />
  }

  if (workspaces.length === 0) {
    return (
      <NoWorkspace
        onCreate={(name) => createMutation.mutateAsync(name)}
        isCreating={createMutation.isPending}
      />
    )
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0]
  // Every time on screen is shown in this workspace's zone (see lib/format.ts).
  setDisplayTimeZone(activeWorkspace.timezone)

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspaceId,
        createWorkspace: (name) => createMutation.mutateAsync(name),
        isCreating: createMutation.isPending,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

function signOut() {
  apiFetch("/auth/logout/", { method: "POST" }).catch(() => {})
  setToken(null)
  window.location.assign("/login")
}

function WorkspaceLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex min-h-screen flex-col items-start justify-center gap-6 bg-page px-6 text-ink sm:px-16">
      <div className="eyebrow">Couldn't load your workspace</div>
      <p className="max-w-[440px] text-[15px] leading-[1.6] text-ink-55">
        The server didn't answer. Check your connection and try again.
      </p>
      <div className="flex items-center gap-6">
        <PrimaryButton type="button" onClick={onRetry}>
          Try again
        </PrimaryButton>
        <button type="button" onClick={signOut} className="border-b border-hair text-[12px] text-ink-55 hover:text-ink">
          Sign out
        </button>
      </div>
    </div>
  )
}

function NoWorkspace({
  onCreate,
  isCreating,
}: {
  onCreate: (name: string) => Promise<Workspace>
  isCreating: boolean
}) {
  const [name, setName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed).catch(() => {
      // Surfaced via the mutation's onError toast above; nothing further to do here.
    })
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-page px-4 py-8 text-ink sm:px-12 sm:py-11">
      <Wordmark />
      <form onSubmit={handleSubmit} className="rise-in flex w-full max-w-[420px] flex-col">
        <div className="eyebrow mb-5">Step one · Workspace</div>
        <h1 className="display text-[40px] leading-[1.02] sm:text-[46px]">
          Name your <em className="text-rust italic">workspace</em>.
        </h1>
        <p className="mt-5 text-[15px] leading-[1.6] text-pretty text-ink-55">
          One workspace holds your connected channels, drafts, and posts. You can add more later.
        </p>
        <Field
          className="mt-9"
          label="Workspace name"
          autoFocus
          placeholder="Acme Co."
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isCreating}
        />
        <PrimaryButton type="submit" className="mt-9 self-start" disabled={isCreating || !name.trim()}>
          {isCreating ? "Creating…" : "Create workspace"}
        </PrimaryButton>
      </form>
      <div className="flex items-center justify-between border-t border-hair pt-5">
        <span className="eyebrow">OmniPost</span>
        <button type="button" onClick={signOut} className="eyebrow hover:text-ink">
          Sign out
        </button>
      </div>
    </div>
  )
}
