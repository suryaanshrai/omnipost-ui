import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import ConfirmDialog from "@/components/editorial/ConfirmDialog"
import Field, { SelectField } from "@/components/editorial/Field"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { useMe } from "@/lib/queries"
import { useWorkspace } from "@/lib/workspace"
import type { Membership } from "@/types/api"

const ROLES: { value: string; label: string; desc: string }[] = [
  { value: "owner", label: "Owner", desc: "Everything, including deleting the workspace" },
  { value: "admin", label: "Admin", desc: "Members, accounts and keys" },
  { value: "editor", label: "Editor", desc: "Publishes and schedules posts" },
  { value: "contributor", label: "Contributor", desc: "Drafts posts for review" },
  { value: "client_reviewer", label: "Client reviewer", desc: "Approves posts" },
  { value: "viewer", label: "Viewer", desc: "Read only" },
]
const RANK: Record<string, number> = { viewer: 0, client_reviewer: 0, contributor: 1, editor: 2, admin: 3, owner: 4 }

export default function MembersBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const me = useMe()
  const members = useQuery({
    queryKey: ["memberships", activeWorkspace.id],
    queryFn: () => apiFetch<Page<Membership>>(`/memberships/?workspace=${activeWorkspace.id}&limit=200`),
    select: (page) => page.results,
  })
  const myRole = members.data?.find((m) => m.user.id === me.data?.pk)?.role ?? "viewer"
  const isAdmin = RANK[myRole] >= RANK.admin
  const grantable = ROLES.filter((r) => RANK[r.value] <= RANK[myRole])
  const [removing, setRemoving] = useState<Membership | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["memberships", activeWorkspace.id] })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiFetch(`/memberships/${id}/`, { method: "PATCH", body: { role } }),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "Could not change the role."),
  })
  const remove = useMutation({
    mutationFn: (m: Membership) => apiFetch(`/memberships/${m.id}/`, { method: "DELETE" }),
    onSuccess: () => {
      setRemoving(null)
      invalidate()
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "Could not remove the member."),
  })

  return (
    <Block title="Members" aside={`${members.data?.length ?? 0}`}>
      <ul className="-mt-6">
        {(members.data ?? []).map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-4 border-b border-hair py-3">
            <span
              aria-hidden="true"
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-rust text-[11px] font-bold text-page uppercase"
            >
              {m.user.username.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">
                {m.user.username}
                {m.user.id === me.data?.pk && <span className="eyebrow ml-2">You</span>}
              </span>
              {m.user.email && <span className="block truncate text-[12.5px] text-ink-55">{m.user.email}</span>}
            </span>
            {isAdmin && m.user.id !== me.data?.pk ? (
              <>
                <select
                  aria-label={`Role for ${m.user.username}`}
                  value={m.role}
                  onChange={(e) => changeRole.mutate({ id: m.id, role: e.target.value })}
                  className="border-b border-hair bg-page py-1 text-[12px] font-bold tracking-[0.12em] uppercase"
                >
                  {ROLES.filter((r) => RANK[r.value] <= RANK[myRole] || r.value === m.role).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <TextButton type="button" tone="muted" onClick={() => setRemoving(m)}>
                  Remove
                </TextButton>
              </>
            ) : (
              <span className="eyebrow">{ROLES.find((r) => r.value === m.role)?.label ?? m.role}</span>
            )}
          </li>
        ))}
      </ul>
      {isAdmin && <AddMember roles={grantable} onAdded={invalidate} />}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        eyebrow="Remove member"
        title={`Remove ${removing?.user.username ?? "this member"}?`}
        description="They lose access to this workspace. Their posts stay."
        confirmLabel="Remove"
        tone="rust"
        onConfirm={() => removing && remove.mutate(removing)}
        pending={remove.isPending}
      />
    </Block>
  )
}

function AddMember({ roles, onAdded }: { roles: typeof ROLES; onAdded: () => void }) {
  const { activeWorkspace } = useWorkspace()
  const [username, setUsername] = useState("")
  const [role, setRole] = useState("editor")
  const [error, setError] = useState<ApiError | null>(null)

  const add = useMutation({
    mutationFn: () =>
      apiFetch("/memberships/", { method: "POST", body: { workspace: activeWorkspace.id, username, role } }),
    onSuccess: () => {
      toast(`${username} added`)
      setUsername("")
      setError(null)
      onAdded()
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not add them.")),
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate()
  }
  return (
    <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-[1fr_180px_auto] sm:items-end">
      <Field
        label="Add someone"
        placeholder="Their username or email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        errors={error?.fieldErrors.username ?? (error && !Object.keys(error.fieldErrors).length ? [error.detail] : undefined)}
        hint="They need an OmniPost account on this server first."
      />
      <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
        {roles.map((r) => (
          <option key={r.value} value={r.value} title={r.desc}>
            {r.label}
          </option>
        ))}
      </SelectField>
      <PrimaryButton type="submit" disabled={!username.trim() || add.isPending}>
        {add.isPending ? "Adding…" : "Add"}
      </PrimaryButton>
    </form>
  )
}
