import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { OutlineButton, PrimaryButton } from "@/components/editorial/Buttons"
import { apiFetch, ApiError } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import type { ImportCsvResult } from "@/types/api"


export function ImportBlock() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportCsvResult | null>(null)
  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append("workspace", String(activeWorkspace.id))
      form.append("file", file!)
      return apiFetch<ImportCsvResult>("/posts/import-csv/", { method: "POST", body: form })
    },
    onSuccess: (r) => {
      setResult(r)
      void queryClient.invalidateQueries({ queryKey: ["calendar"] })
      void queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "Could not import the file."),
  })

  return (
    <Block title="Import from CSV" aside="Bulk schedule">
      <p className="max-w-[560px] text-[14px] leading-[1.6] text-ink-55">
        Columns <code className="text-ink">text</code> and <code className="text-ink">channel_id</code>, optionally{" "}
        <code className="text-ink">link</code>, <code className="text-ink">kind</code> and{" "}
        <code className="text-ink">run_at</code> (ISO 8601). Rows without a run_at go into that channel's next queue
        slot.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <OutlineButton type="button" onClick={() => inputRef.current?.click()}>
          {file ? "Choose another file" : "Choose a CSV"}
        </OutlineButton>
        {file && <span className="text-[13px] text-ink">{file.name}</span>}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setResult(null)
            e.target.value = ""
          }}
        />
        <PrimaryButton type="button" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
          {upload.isPending ? "Importing…" : "Import"}
        </PrimaryButton>
      </div>
      {result && (
        <div className="mt-6 border-l border-hair pl-5" aria-live="polite">
          <p className="text-[14px] text-ink">
            {result.created} {result.created === 1 ? "post" : "posts"} scheduled
            {result.errors.length > 0 && `, ${result.errors.length} ${result.errors.length === 1 ? "row" : "rows"} skipped`}.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {result.errors.map((e) => (
                <li key={e.row} className="text-rust">
                  Row {e.row}: {typeof e.detail === "string" ? e.detail : Array.isArray(e.detail) ? e.detail.join(" ") : JSON.stringify(e.detail)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Block>
  )
}
