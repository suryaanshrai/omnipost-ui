import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { PrimaryButton } from "@/components/editorial/Buttons"
import Field, { } from "@/components/editorial/Field"
import { apiFetch, ApiError, type Page } from "@/lib/api"
import { timezoneOptions } from "@/lib/format"
import { useWorkspace } from "@/lib/workspace"
import type { Workspace } from "@/types/api"

export function WorkspaceBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [name, setName] = useState(activeWorkspace.name)
  const [tz, setTz] = useState(activeWorkspace.timezone ?? "")
  const [approvals, setApprovals] = useState(!!activeWorkspace.approval_workflow_enabled)
  const [error, setError] = useState<ApiError | null>(null)
  const zones = useMemo(timezoneOptions, [])

  useEffect(() => {
    setName(activeWorkspace.name)
    setTz(activeWorkspace.timezone ?? "")
    setApprovals(!!activeWorkspace.approval_workflow_enabled)
  }, [activeWorkspace])

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Workspace>(`/workspaces/${activeWorkspace.id}/`, {
        method: "PATCH",
        body: { name: name.trim(), timezone: tz.trim(), approval_workflow_enabled: approvals },
      }),
    onSuccess: (updated) => {
      setError(null)
      queryClient.setQueryData<Page<Workspace>>(["workspaces"], (prev) =>
        prev ? { ...prev, results: prev.results.map((w) => (w.id === updated.id ? updated : w)) } : prev
      )
      queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
      toast("Workspace saved")
    },
    onError: (err) => setError(err instanceof ApiError ? err : null),
  })

  const dirty =
    name !== activeWorkspace.name ||
    tz !== (activeWorkspace.timezone ?? "") ||
    approvals !== !!activeWorkspace.approval_workflow_enabled

  return (
    <Block title="Workspace" aside={activeWorkspace.slug}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
        className="grid gap-7 sm:grid-cols-2"
      >
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} errors={error?.fieldErrors.name} />
        <Field
          label="Timezone"
          list="omni-ws-timezones"
          placeholder="UTC"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          errors={error?.fieldErrors.timezone}
          hint="The default for channels that don't set their own."
        />
        <datalist id="omni-ws-timezones">
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
          <input
            type="checkbox"
            checked={approvals}
            onChange={(e) => setApprovals(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--rust)]"
          />
          <span>
            <span className="block text-[14px] font-semibold text-ink">Require approval before dispatch</span>
            <span className="block text-[13px] leading-[1.55] text-ink-55">
              Drafts are submitted for review and only approved posts can be scheduled or queued. Adds an Approvals
              screen to the sidebar.
            </span>
          </span>
        </label>
        <div className="sm:col-span-2">
          <PrimaryButton type="submit" disabled={!dirty || save.isPending || !name.trim()}>
            {save.isPending ? "Saving…" : "Save"}
          </PrimaryButton>
          {error && !error.fieldErrors.name && !error.fieldErrors.timezone && (
            <p className="mt-3 text-[13px] text-rust">{error.detail}</p>
          )}
        </div>
      </form>
    </Block>
  )
}
