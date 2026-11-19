import { useEffect, useId, useRef, useState } from "react"
import type { DragEvent, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Whether a file satisfies an `accept` string such as "image/*,video/*" or ".csv,text/csv". */
function accepts(file: File, accept: string): boolean {
  const rules = accept
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
  if (!rules.length) return true
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return rules.some((rule) =>
    rule.startsWith(".") ? name.endsWith(rule) : rule.endsWith("/*") ? type.startsWith(rule.slice(0, -1)) : type === rule
  )
}

/** The files a picker with these settings would have allowed, as a FileList. */
function allowed(files: Iterable<File>, accept: string, multiple: boolean): FileList | null {
  const kept = [...files].filter((f) => accepts(f, accept))
  if (!kept.length) return null
  const transfer = new DataTransfer()
  for (const f of multiple ? kept : kept.slice(0, 1)) transfer.items.add(f)
  return transfer.files
}

/**
 * Drop files, paste them, or click to choose; `children` (library, alt
 * text, thumbnails) sit under it. Dropped and pasted files go through the
 * same `accept` / `multiple` rules as the picker.
 */
export default function Dropzone({
  accept,
  multiple,
  onFiles,
  uploading,
  children,
}: {
  accept: string
  multiple: boolean
  onFiles: (files: FileList) => void
  uploading: boolean
  children?: ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const labelId = useId()
  const hintId = useId()
  const [over, setOver] = useState(false)
  // dragenter/dragleave fire for every child the pointer crosses; count
  // them so the highlight doesn't flicker.
  const depth = useRef(0)
  const latest = useRef({ accept, multiple, onFiles })
  latest.current = { accept, multiple, onFiles }

  // While this is on screen: a file dropped just outside the zone doesn't
  // make the browser navigate away to it, and a pasted image uploads.
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault()
    }
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files
      if (!files?.length) return
      const { accept, multiple, onFiles } = latest.current
      const list = allowed(files, accept, multiple)
      if (!list) return
      e.preventDefault()
      onFiles(list)
    }
    window.addEventListener("dragover", block)
    window.addEventListener("drop", block)
    window.addEventListener("paste", onPaste)
    return () => {
      window.removeEventListener("dragover", block)
      window.removeEventListener("drop", block)
      window.removeEventListener("paste", onPaste)
    }
  }, [])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    depth.current = 0
    setOver(false)
    const list = allowed(e.dataTransfer.files, accept, multiple)
    if (list) onFiles(list)
  }

  const kinds = accept
    .split(",")
    .map((a) => a.trim().replace(/\/\*$/, ""))
    .filter(Boolean)
    .join(" or ")

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-3">
      <span id={labelId} className="eyebrow">
        Media
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-describedby={hintId}
        aria-busy={uploading || undefined}
        onDragEnter={(e) => {
          e.preventDefault()
          depth.current += 1
          setOver(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1)
          if (depth.current === 0) setOver(false)
        }}
        onDrop={onDrop}
        className={cn(
          "flex h-28 w-full flex-col items-center justify-center gap-1.5 border border-dashed text-center transition-colors",
          over ? "border-rust bg-rust/[.05]" : "border-ink/50 hover:border-ink"
        )}
      >
        <span className="text-[13px] text-ink" aria-live="polite">
          {uploading ? "Uploading…" : "Drop, paste, or click to choose"}
        </span>
        <span id={hintId} className="eyebrow">
          {kinds}
        </span>
      </button>
      {/* The button above is the control; this only opens the system picker. */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
          e.target.value = ""
        }}
      />
      {children}
    </div>
  )
}
