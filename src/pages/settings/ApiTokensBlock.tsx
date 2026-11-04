import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import Field from "@/components/editorial/Field"
import Modal from "@/components/editorial/Modal"
import { apiFetch, ApiError } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import type { ApiToken, CreatedApiToken } from "@/types/api"
import { errorText } from "./shared"

const EXPIRY = [
  { value: "", label: "Never" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
]

/** Personal API tokens: for scripts, Zapier/n8n and the MCP server. */
export default function ApiTokensBlock() {
  const queryClient = useQueryClient()
  const tokens = useQuery({ queryKey: ["api-tokens"], queryFn: () => apiFetch<ApiToken[]>("/account/tokens/") })
  const [name, setName] = useState("")
  const [readOnly, setReadOnly] = useState(false)
  const [expiry, setExpiry] = useState("90")
  const [error, setError] = useState<ApiError | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["api-tokens"] })

  const add = useMutation({
    mutationFn: () =>
      apiFetch<CreatedApiToken>("/account/tokens/", {
        method: "POST",
        body: { name: name.trim(), read_only: readOnly, expires_in_days: expiry ? Number(expiry) : null },
      }),
    onSuccess: (token) => {
      setName("")
      setError(null)
      setCreated(token.key)
      void invalidate()
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not make the token.")),
  })
  const revoke = useMutation({
    mutationFn: (t: ApiToken) => apiFetch(`/account/tokens/${t.id}/`, { method: "DELETE" }),
    onSuccess: () => {
      toast("Token revoked")
      void invalidate()
    },
    onError: (err) => toast.error(errorText(err, "Could not revoke the token.")),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate()
  }

  return (
    <Block title="API tokens" aside="Scripts, Zapier, n8n, AI assistants">
      <p className="-mt-2 text-[14px] leading-[1.6] text-ink-55">
        Send <code>Authorization: Bearer &lt;token&gt;</code> to the API. A token can do what you can (or only read),
        but can't make more tokens, change your password or delete the account. To post from Claude, use the
        OmniPost MCP server with a token.
      </p>
      <ul className="mt-4">
        {(tokens.data ?? []).map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-4 border-b border-hair py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">
                {t.name} <code className="ml-1 text-[12px] font-normal text-ink-55">op_{t.prefix}_…</code>
              </span>
              <span className="eyebrow mt-1 block">
                {t.read_only ? "Read-only" : "Full access"}
                {` · ${t.last_used_at ? `used ${formatStamp(t.last_used_at)}` : "never used"}`}
                {t.expires_at ? ` · expires ${formatStamp(t.expires_at)}` : ""}
              </span>
            </span>
            <TextButton
              type="button"
              tone="muted"
              onClick={() => window.confirm(`Revoke "${t.name}"? Anything using it stops working.`) && revoke.mutate(t)}
            >
              Revoke
            </TextButton>
          </li>
        ))}
        {tokens.isSuccess && !tokens.data.length && <li className="py-3 text-[13.5px] text-ink-55">No tokens yet.</li>}
      </ul>
      <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto]">
        <Field
          label="Name"
          placeholder="e.g. Claude, n8n"
          value={name}
          onChange={(e) => setName(e.target.value)}
          errors={error?.fieldErrors.name ?? (error && !Object.keys(error.fieldErrors).length ? [error.detail] : undefined)}
        />
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Expires</span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="min-h-11 border-b border-hair bg-transparent text-[15px] text-ink focus:border-ink focus:outline-none"
          >
            {EXPIRY.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--rust)]"
            checked={readOnly}
            onChange={(e) => setReadOnly(e.target.checked)}
          />
          <span className="text-[14px]">Read-only: can look, can't post or change anything</span>
        </label>
        <PrimaryButton type="submit" className="self-start sm:col-span-2 sm:justify-self-start" disabled={!name.trim() || add.isPending}>
          {add.isPending ? "Making…" : "Make token"}
        </PrimaryButton>
      </form>
      <Modal
        open={!!created}
        onOpenChange={(o) => !o && setCreated(null)}
        eyebrow="Token made"
        title="Copy your token"
        description="It's shown only this once. Store it somewhere safe, like a password manager."
        footer={
          <>
            <TextButton type="button" onClick={() => created && navigator.clipboard?.writeText(created).then(() => toast("Copied"))}>
              Copy
            </TextButton>
            <PrimaryButton type="button" onClick={() => setCreated(null)}>
              Done
            </PrimaryButton>
          </>
        }
      >
        <code className="block border border-hair p-3 text-[13px] break-all select-all">{created}</code>
      </Modal>
    </Block>
  )
}
