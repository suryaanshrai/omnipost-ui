import { useId, useMemo } from "react"
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react"
import { timezoneOptions } from "@/lib/format"
import { cn } from "@/lib/utils"

// The control's only boundary is its bottom rule, so it is drawn at half
// ink: 3:1 against the page in Day and Night (WCAG 1.4.11), where the 14%
// hairline used elsewhere was 1.3:1. It turns rust on focus, and on
// `:user-invalid` (only after the person has interacted with it, never on
// load; modern-web-guidance `validate-input-after-interaction`).
const CONTROL =
  "w-full border-0 border-b border-ink/50 bg-transparent px-0 py-2.5 text-[15px] text-ink transition-colors duration-300 placeholder:text-ink-38 focus:border-rust user-invalid:border-rust aria-invalid:border-rust disabled:opacity-50"

/** Wires a control to its label, hint and error: ids and aria, which a caller can't accidentally override. */
function useFieldIds(props: { id?: string; "aria-describedby"?: string }, hint: ReactNode, errors?: string[]) {
  const generated = useId()
  const id = props.id ?? generated
  const invalid = !!errors?.length
  // Both the hint and the error describe the control: the hint doesn't
  // vanish for screen readers the moment there's an error.
  const describedBy =
    [props["aria-describedby"], hint ? `${id}-hint` : null, invalid ? `${id}-error` : null].filter(Boolean).join(" ") || undefined
  return { id, invalid, a11y: { id, "aria-invalid": invalid || undefined, "aria-describedby": describedBy } }
}

/** Borderless input on a 1px bottom rule that turns rust on focus, with an eyebrow label above and field errors below. */
export default function Field({
  label,
  errors,
  hint,
  className,
  ...props
}: { label: ReactNode; errors?: string[]; hint?: ReactNode; className?: string } & ComponentPropsWithoutRef<"input">) {
  const { id, a11y } = useFieldIds(props, hint, errors)
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <input {...props} {...a11y} className={CONTROL} />
      <FieldNote id={id} hint={hint} errors={errors} />
    </div>
  )
}

/**
 * The same treatment for a multi-line textarea. It grows with what's
 * written (`field-sizing: content`, between `rows` lines and a cap) where
 * supported; elsewhere it keeps its `rows` height and a resize handle.
 */
export function TextareaField({
  label,
  errors,
  hint,
  className,
  rows = 2,
  ...props
}: { label: ReactNode; errors?: string[]; hint?: ReactNode; className?: string } & ComponentPropsWithoutRef<"textarea">) {
  const { id, a11y } = useFieldIds(props, hint, errors)
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <textarea
        {...props}
        {...a11y}
        rows={rows}
        className={cn(CONTROL, "autogrow resize-y leading-[1.6]")}
        style={{ ...props.style, "--rows": rows } as CSSProperties}
      />
      <FieldNote id={id} hint={hint} errors={errors} />
    </div>
  )
}

function FieldNote({ id, hint, errors }: { id: string; hint?: ReactNode; errors?: string[] }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-[12px] text-ink-55">
          {hint}
        </p>
      )}
      {!!errors?.length && (
        <p id={`${id}-error`} className="mt-2 text-[12px] leading-[1.5] text-rust">
          {errors.join(" ")}
        </p>
      )}
    </>
  )
}

/**
 * Same rule-and-eyebrow treatment for a native <select>. Where customizable
 * selects are supported (`appearance: base-select`), the open list is drawn
 * in the design's paper and ink too (index.css `.select-field`); elsewhere
 * it's the platform's own list, themed by `color-scheme`.
 */
export function SelectField({
  label,
  errors,
  hint,
  className,
  children,
  ...props
}: { label: ReactNode; errors?: string[]; hint?: ReactNode; className?: string; children: ReactNode } & ComponentPropsWithoutRef<"select">) {
  const { id, a11y } = useFieldIds(props, hint, errors)
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <select {...props} {...a11y} className={cn(CONTROL, "select-field cursor-pointer bg-page")}>
        {children}
      </select>
      <FieldNote id={id} hint={hint} errors={errors} />
    </div>
  )
}

/** A timezone input that suggests IANA names as you type. */
export function TimezoneField(props: Omit<Parameters<typeof Field>[0], "list">) {
  const listId = useId()
  const zones = useMemo(timezoneOptions, [])
  return (
    <>
      <Field list={listId} autoCapitalize="none" autoCorrect="off" spellCheck={false} {...props} />
      <datalist id={listId}>
        {zones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
    </>
  )
}
