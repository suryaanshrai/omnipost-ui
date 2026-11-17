import { useRef, useState } from "react"
import type { DragEvent, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Drop files or click to choose; `children` (library, alt text, thumbnails) sit under it. */
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
  const [over, setOver] = useState(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files)
  }
  return (
    <div className="flex flex-col gap-3">
      <span className="eyebrow">Media</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex h-28 w-full flex-col items-center justify-center gap-1.5 border border-dashed text-center transition-colors",
          over ? "border-rust bg-rust/[.05]" : "border-hair hover:border-ink"
        )}
      >
        <span className="text-[13px] text-ink">{uploading ? "Uploading…" : "Drop a file, or click to choose"}</span>
        <span className="eyebrow">{accept.replace(/\/\*/g, "").replace(",", " or ")}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
          e.target.value = ""
        }}
      />
      {children}
    </div>
  )
}
