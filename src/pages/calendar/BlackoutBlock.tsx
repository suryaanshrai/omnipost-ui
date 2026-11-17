import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Block from "@/components/app/Block"
import { OutlineButton, TextButton } from "@/components/editorial/Buttons"
import Field, { SelectField } from "@/components/editorial/Field"
import { apiFetch, ApiError } from "@/lib/api"
import { formatStamp, fromLocalInput } from "@/lib/format"
import { useWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { BlackoutWindow, Channel } from "@/types/api"


export function BlackoutBlock({ channels, windows }: { channels: Channel[]; windows: BlackoutWindow[] }) {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [label, setLabel] = useState("")
  const [channel, setChannel] = useState("")
  const [starts, setStarts] = useState("")
  const [ends, setEnds] = useState("")
  const [error, setError] = useState<ApiError | null>(null)
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["blackout-windows", activeWorkspace.id] })
  }
  const add = useMutation({
    mutationFn: () =>
      apiFetch<BlackoutWindow>("/blackout-windows/", {
        method: "POST",
        body: {
          workspace: activeWorkspace.id,
          channel: channel ? Number(channel) : null,
          label: label.trim(),
          starts_at: fromLocalInput(starts),
          ends_at: fromLocalInput(ends),
        },
      }),
    onSuccess: () => {
      setError(null)
      setLabel("")
      setStarts("")
      setEnds("")
      invalidate()
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not add the window.")),
  })
  const toggle = useMutation({
    mutationFn: (w: BlackoutWindow) => apiFetch(`/blackout-windows/${w.id}/`, { method: "PATCH", body: { is_active: !w.is_active } }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (w: BlackoutWindow) => apiFetch(`/blackout-windows/${w.id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  })
  const name = (id: number | null | undefined) => (id ? channels.find((c) => c.id === id)?.display_name ?? "One channel" : "All channels")
  const sorted = [...windows].sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  return (
    <Block title="Blackout windows" aside="The queue skips these">
      <ul className="-mt-6 empty:mt-0">
        {sorted.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hair py-3">
            <span className={cn("min-w-0 flex-1", w.is_active === false && "text-ink-38")}>
              <span className="block text-[14px] font-semibold">{w.label || "Blackout"}</span>
              <span className="eyebrow mt-0.5 block">
                {name(w.channel)} · {formatStamp(w.starts_at)} → {formatStamp(w.ends_at)}
              </span>
            </span>
            <TextButton type="button" tone="muted" onClick={() => toggle.mutate(w)}>
              {w.is_active === false ? "Resume" : "Pause"}
            </TextButton>
            <TextButton type="button" tone="muted" onClick={() => window.confirm("Remove this? It can't be undone.") && remove.mutate(w)}>
              Remove
            </TextButton>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          add.mutate()
        }}
        className="mt-6 grid gap-6 sm:grid-cols-2"
      >
        <Field label="Label (optional)" placeholder="Product launch freeze" value={label} onChange={(e) => setLabel(e.target.value)} />
        <SelectField label="Applies to" value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="">All channels</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </SelectField>
        <Field label="Starts" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} errors={error?.fieldErrors.starts_at} />
        <Field label="Ends" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} errors={error?.fieldErrors.ends_at} />
        {error && !error.fieldErrors.starts_at && !error.fieldErrors.ends_at && (
          <p className="text-[13px] text-rust sm:col-span-2">{error.detail}</p>
        )}
        <div className="sm:col-span-2">
          <OutlineButton type="submit" disabled={!starts || !ends || add.isPending}>
            Add blackout
          </OutlineButton>
        </div>
      </form>
    </Block>
  )
}
