import { TextButton } from "@/components/editorial/Buttons"
import { TextareaField } from "@/components/editorial/Field"
import { cn } from "@/lib/utils"

/**
 * Replies that follow the main post as a thread, on networks that support
 * threads (the main post is part 1). Other networks get the main post only.
 */
export default function ThreadParts({
  parts,
  onChange,
  maxLength,
  networks,
}: {
  parts: string[]
  onChange: (parts: string[]) => void
  maxLength: number | null
  networks: string[]
}) {
  const set = (i: number, text: string) => onChange(parts.map((p, j) => (j === i ? text : p)))
  return (
    <div className="flex flex-col gap-4">
      {parts.map((part, i) => (
        <div key={i} className="border-l border-hair pl-5">
          <TextareaField
            rows={3}
            label={`Part ${i + 2}`}
            value={part}
            onChange={(e) => set(i, e.target.value)}
            placeholder="The next post in the thread…"
          />
          <div className="mt-2 flex items-center justify-between">
            <TextButton type="button" tone="muted" onClick={() => onChange(parts.filter((_, j) => j !== i))}>
              Remove part
            </TextButton>
            {maxLength != null && (
              <span className={cn("eyebrow", part.length > maxLength && "text-rust")}>
                {part.length} / {maxLength}
              </span>
            )}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-4">
        <TextButton type="button" onClick={() => onChange([...parts, ""])} disabled={parts.length >= 24}>
          {parts.length ? "Add another part" : "Make it a thread"}
        </TextButton>
        <span className="text-[12.5px] text-ink-55">
          Thread on {networks.join(", ")}. Other channels get the first part only.
        </span>
      </div>
    </div>
  )
}
