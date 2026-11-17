import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Block from "@/components/app/Block"
import { OutlineButton, PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import Field from "@/components/editorial/Field"
import Modal from "@/components/editorial/Modal"
import { apiFetch, ApiError, setSignedIn } from "@/lib/api"
import { useMe } from "@/lib/queries"
import type { UserDetails } from "@/types/api"

/** The signed-in person: email alerts, password, data export, account deletion. */
export default function AccountBlock() {
  const me = useMe()
  const queryClient = useQueryClient()

  const prefs = useMutation({
    mutationFn: (body: Partial<Pick<UserDetails, "email_notifications" | "weekly_digest">>) =>
      apiFetch<UserDetails>("/auth/user/", { method: "PATCH", body }),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user)
      toast("Saved")
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail : "Could not save."),
  })

  const exportData = useMutation({
    mutationFn: () => apiFetch<unknown>("/account/export/"),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "omnipost-export.json"
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: () => toast.error("Could not export your data."),
  })

  const user = me.data
  return (
    <Block title="Your account" aside={user?.username}>
      <dl className="-mt-2 grid grid-cols-[120px_1fr] gap-y-3 text-[14px]">
        <dt className="eyebrow self-center">Email</dt>
        <dd>{user?.email || <span className="text-ink-55">None set</span>}</dd>
      </dl>

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-[14px]">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[var(--color-rust)]"
          checked={!!user?.email_notifications}
          disabled={!user || prefs.isPending}
          onChange={(e) => prefs.mutate({ email_notifications: e.target.checked })}
        />
        <span>
          Email me when a post fails or an account needs reconnecting
          <span className="mt-0.5 block text-[13px] text-ink-55">Alerts always show in the app.</span>
        </span>
      </label>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14px]">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[var(--color-rust)]"
          checked={!!user?.weekly_digest}
          disabled={!user || prefs.isPending}
          onChange={(e) => prefs.mutate({ weekly_digest: e.target.checked })}
        />
        <span>
          Send me a Monday summary of last week's posts
        </span>
      </label>

      <ChangePassword />

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-hair pt-6">
        <OutlineButton type="button" onClick={() => exportData.mutate()} disabled={exportData.isPending}>
          {exportData.isPending ? "Preparing…" : "Download my data"}
        </OutlineButton>
        <DeleteAccount />
      </div>
    </Block>
  )
}

function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [old, setOld] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<ApiError | null>(null)
  const mismatch = confirm.length > 0 && confirm !== next

  const change = useMutation({
    mutationFn: () =>
      apiFetch("/auth/password/change/", {
        method: "POST",
        body: { old_password: old, new_password1: next, new_password2: confirm },
      }),
    onSuccess: () => {
      toast("Password changed")
      setOpen(false)
      setOld("")
      setNext("")
      setConfirm("")
      setError(null)
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not change the password.")),
  })

  if (!open) {
    return (
      <TextButton type="button" className="mt-6" onClick={() => setOpen(true)}>
        Change password
      </TextButton>
    )
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!mismatch) change.mutate()
  }
  return (
    <form onSubmit={submit} className="mt-6 flex max-w-[380px] flex-col gap-6" noValidate>
      <Field
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={old}
        onChange={(e) => setOld(e.target.value)}
        errors={error?.fieldErrors.old_password}
      />
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        errors={error?.fieldErrors.new_password1}
      />
      <Field
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        errors={mismatch ? ["The passwords don't match."] : error?.fieldErrors.new_password2}
      />
      {error && !Object.keys(error.fieldErrors).length && (
        <p role="alert" className="text-[13px] text-rust">
          {error.detail}
        </p>
      )}
      <div className="flex items-center gap-6">
        <PrimaryButton type="submit" disabled={!old || !next || !confirm || mismatch || change.isPending}>
          {change.isPending ? "Saving…" : "Change password"}
        </PrimaryButton>
        <TextButton type="button" tone="muted" onClick={() => setOpen(false)}>
          Cancel
        </TextButton>
      </div>
    </form>
  )
}

function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<ApiError | null>(null)
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: () => apiFetch("/account/delete/", { method: "POST", body: { password } }),
    onSuccess: () => {
      setSignedIn(false)
      queryClient.clear()
      window.location.assign("/")
    },
    onError: (err) => setError(err instanceof ApiError ? err : new ApiError(0, "Could not delete the account.")),
  })

  return (
    <>
      <TextButton type="button" tone="rust" onClick={() => setOpen(true)}>
        Delete account
      </TextButton>
      <Modal
        open={open}
        onOpenChange={(o) => !remove.isPending && setOpen(o)}
        eyebrow="Delete account"
        title="Delete your account?"
        description="Workspaces where you're the only member are deleted with it: channels, posts and media. Posts already published stay up on each platform. This can't be undone."
        footer={
          <>
            <TextButton type="button" tone="muted" onClick={() => setOpen(false)} disabled={remove.isPending}>
              Keep my account
            </TextButton>
            <PrimaryButton type="button" onClick={() => remove.mutate()} disabled={!password || remove.isPending}>
              {remove.isPending ? "Deleting…" : "Delete everything"}
            </PrimaryButton>
          </>
        }
      >
        <Field
          label="Your password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          errors={error?.fieldErrors.password}
        />
        {error && !error.fieldErrors.password && (
          <p role="alert" className="mt-4 text-[13px] text-rust">
            {error.detail}
          </p>
        )}
      </Modal>
    </>
  )
}
