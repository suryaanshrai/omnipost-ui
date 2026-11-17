import type { ReactNode } from "react"
import Field from "@/components/editorial/Field"
import type { AppCredentialInput } from "@/lib/queries"

/** Client id, secret and label for registering a platform app (Settings and the connect dialog). */
export default function AppCredentialFields({
  value,
  onChange,
  errors = {},
  labelHint,
  autoFocus,
}: {
  value: AppCredentialInput
  onChange: (value: AppCredentialInput) => void
  errors?: Record<string, string[]>
  labelHint?: ReactNode
  autoFocus?: boolean
}) {
  return (
    <>
      <Field
        label="Client id"
        autoFocus={autoFocus}
        value={value.client_id}
        onChange={(e) => onChange({ ...value, client_id: e.target.value })}
        errors={errors.client_id}
      />
      <Field
        label="Client secret"
        type="password"
        autoComplete="off"
        value={value.client_secret}
        onChange={(e) => onChange({ ...value, client_secret: e.target.value })}
        errors={errors.client_secret}
      />
      <Field
        label="Label (optional)"
        value={value.label}
        onChange={(e) => onChange({ ...value, label: e.target.value })}
        errors={errors.label}
        hint={labelHint}
      />
    </>
  )
}
