import { useState } from "react"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { OutlineButton } from "@/components/editorial/Buttons"
import Field, { } from "@/components/editorial/Field"
import { useWorkspace } from "@/lib/workspace"

export function NewWorkspaceBlock() {
  const { createWorkspace, isCreating } = useWorkspace()
  const [name, setName] = useState("")
  return (
    <Block title="Another workspace">
      <p className="mb-5 max-w-[560px] text-[14px] leading-[1.6] text-ink-55">
        A separate set of channels, drafts and posts — for a client, or a second brand. Switch between them from the
        sidebar.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          createWorkspace(name.trim())
            .then((w) => {
              setName("")
              toast(`Switched to ${w.name}`)
            })
            .catch(() => {})
        }}
        className="flex flex-wrap items-end gap-6"
      >
        <Field label="Name" className="min-w-[240px] flex-1" value={name} onChange={(e) => setName(e.target.value)} />
        <OutlineButton type="submit" disabled={!name.trim() || isCreating}>
          {isCreating ? "Creating…" : "Create workspace"}
        </OutlineButton>
      </form>
    </Block>
  )
}
