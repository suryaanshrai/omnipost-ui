import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import type { Workspace } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

  const { data, isLoading } = useQuery({
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
      <div className="flex min-h-screen items-center justify-center bg-page text-ink-55 text-sm">
        Loading your workspace…
      </div>
    )
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

// A plain, functional prompt rather than the design's editorial treatment —
// the shell it lives inside (App.tsx) doesn't get its visual pass until
// Phase D. It's built on the same tokenized shadcn components everything
// else uses, so it's already on-palette even before that pass.
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
    <div className="flex min-h-screen items-center justify-center bg-page px-6">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="font-display text-3xl text-ink">Name your workspace</h1>
        <p className="text-sm text-ink-55">
          One workspace holds your connected channels, drafts, and posts. You can add more later.
        </p>
        <Input
          autoFocus
          placeholder="Acme Co."
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isCreating}
        />
        <Button type="submit" disabled={isCreating || !name.trim()}>
          {isCreating ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </div>
  )
}
