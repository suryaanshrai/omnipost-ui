import { useId, useState } from "react"
import type { ComponentPropsWithoutRef, ReactNode } from "react"
import Beam from "@/components/fx/Beam"
import { cn } from "@/lib/utils"

const CONTROL =
  "w-full border-0 border-b border-hair bg-transparent px-0 py-2.5 text-[15px] text-ink outline-none transition-colors duration-300 placeholder:text-ink-38 focus:border-rust disabled:opacity-50"

/** Borderless input on a 1px bottom rule that turns rust on focus, with an eyebrow label above and field errors below. */
export default function Field({
  label,
  errors,
  hint,
  className,
  ...props
}: { label: ReactNode; errors?: string[]; hint?: ReactNode; className?: string } & ComponentPropsWithoutRef<"input">) {
  const generated = useId()
  const id = props.id ?? generated
  const invalid = !!errors?.length
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <RuleBeam>
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className={cn(CONTROL, invalid && "border-rust")}
          {...props}
        />
      </RuleBeam>
      <FieldNote id={id} hint={hint} errors={errors} />
    </div>
  )
}

/** The same treatment for a multi-line textarea. */
export function TextareaField({
  label,
  errors,
  hint,
  className,
  ...props
}: { label: ReactNode; errors?: string[]; hint?: ReactNode; className?: string } & ComponentPropsWithoutRef<"textarea">) {
  const generated = useId()
  const id = props.id ?? generated
  const invalid = !!errors?.length
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <RuleBeam>
        <textarea
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className={cn(CONTROL, "block resize-y leading-[1.6]", invalid && "border-rust")}
          {...props}
        />
      </RuleBeam>
      <FieldNote id={id} hint={hint} errors={errors} />
    </div>
  )
}

/** While the control has focus, a rust glow travels along its bottom rule (border-beam's `line` type). */
function RuleBeam({ children }: { children: ReactNode }) {
  const [focused, setFocused] = useState(false)
  return (
    <Beam size="line" active={focused} strength={0.9} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      {children}
    </Beam>
  )
}

function FieldNote({ id, hint, errors }: { id: string; hint?: ReactNode; errors?: string[] }) {
  if (errors?.length) {
    return (
      <p id={`${id}-error`} className="mt-2 text-[12px] leading-[1.5] text-rust">
        {errors.join(" ")}
      </p>
    )
  }
  return hint ? <p className="mt-2 text-[12px] text-ink-45">{hint}</p> : null
}

/** Same rule-and-eyebrow treatment for a native <select>. */
export function SelectField({
  label,
  errors,
  className,
  children,
  ...props
}: { label: ReactNode; errors?: string[]; className?: string; children: ReactNode } & ComponentPropsWithoutRef<"select">) {
  const generated = useId()
  const id = props.id ?? generated
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <RuleBeam>
        <select id={id} className={cn(CONTROL, "cursor-pointer bg-page", errors?.length && "border-rust")} {...props}>
          {children}
        </select>
      </RuleBeam>
      {!!errors?.length && <p className="mt-2 text-[12px] text-rust">{errors.join(" ")}</p>}
    </div>
  )
}
