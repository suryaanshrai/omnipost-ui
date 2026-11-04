import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { ChannelToggle } from "@/components/app/ChannelChip"
import { PrimaryButton, TextButton } from "@/components/editorial/Buttons"
import Field, { TextareaField } from "@/components/editorial/Field"
import HoverRow from "@/components/editorial/HoverRow"
import Modal from "@/components/editorial/Modal"
import { timeZoneLabel } from "@/lib/format"
import { mediaUrl } from "@/lib/media"
import type { Post, PostKind } from "@/types/api"
import AiPanel from "./AiPanel"
import { kindLabel, POST_KINDS } from "./compose-context"
import Dropzone from "./Dropzone"
import { CharCounts, Findings } from "./Findings"
import { AltTextField, MediaLibrary } from "./MediaTools"
import ThreadParts from "./ThreadParts"
import { useComposeDraft, type SaveOutcome } from "./useComposeDraft"

const ACCEPT: Record<PostKind, string> = {
  text: "",
  image: "image/*",
  video: "video/*",
  short_video: "video/*",
  story: "image/*,video/*",
}

export default function ComposeModal({
  open,
  onOpenChange,
  initialKind,
  post,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialKind?: PostKind
  post?: Post
}) {
  const navigate = useNavigate()
  const onSaved = (outcome: SaveOutcome) => {
    onOpenChange(false)
    if (outcome === "draft") {
      toast(post ? "Draft updated" : "Saved to Drafts")
      if (!post) void navigate("/app/drafts")
    } else if (outcome === "review") {
      toast("Sent for review")
      void navigate("/app/approvals")
    } else if (outcome === "scheduled") {
      toast("Scheduled")
      void navigate("/app/calendar")
    } else {
      toast("Publishing now. Delivery reports appear in Posts.")
      void navigate("/app")
    }
  }
  const d = useComposeDraft({ post, initialKind, open, onSaved })
  const { kind, media, save, saveError } = d

  const isMediaKind = kind && kind !== "text"
  const dispatchLabel = d.reviewFirst ? "Submit for review" : d.inFuture ? "Schedule" : "Publish now"
  const step = kind ? 2 : 1

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (save.isPending) return
        // Escape or a click outside used to throw away a half-written post.
        if (!o && d.dirty && !window.confirm("Discard this post? What you've written won't be saved.")) return
        onOpenChange(o)
      }}
      eyebrow={step === 1 ? "Step one · Format" : `Step two · ${kindLabel(kind)}`}
      title={step === 1 ? "What are you posting?" : d.editing ? "Edit the draft" : "Write it once"}
      footer={
        <>
          <div>
            {step === 2 && (
              <TextButton type="button" tone="muted" onClick={() => d.setKind(undefined)} disabled={save.isPending}>
                ← Back
              </TextButton>
            )}
          </div>
          <div className="flex items-center gap-6">
            <TextButton type="button" tone="muted" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </TextButton>
            {step === 2 && (
              <>
                <TextButton type="button" onClick={() => save.mutate("draft")} disabled={!d.canSave}>
                  {d.editing ? "Save changes" : "Save draft"}
                </TextButton>
                <PrimaryButton
                  type="button"
                  onClick={() => save.mutate("dispatch")}
                  disabled={!d.canDispatch}
                  title={d.selectedChannels.length ? undefined : "Choose at least one channel"}
                >
                  {save.isPending ? "Working…" : dispatchLabel}
                </PrimaryButton>
              </>
            )}
          </div>
        </>
      }
    >
      {step === 1 ? (
        <div className="-mx-2 border-t border-hair">
          {POST_KINDS.map((k, i) => (
            <HoverRow
              key={k.kind}
              as="button"
              type="button"
              onClick={() => d.setKind(k.kind)}
              className="grid w-full grid-cols-[44px_1fr_24px] items-center px-2 py-4 text-left"
            >
              <HoverRow.Num className="text-[20px]">0{i + 1}</HoverRow.Num>
              <HoverRow.Title className="text-[13px] font-bold tracking-[0.14em] uppercase">{k.label}</HoverRow.Title>
              <HoverRow.Arrow />
            </HoverRow>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {isMediaKind && (
            <Dropzone accept={ACCEPT[kind]} multiple={kind === "image"} onFiles={d.upload} uploading={d.uploading > 0}>
              <MediaLibrary
                kinds={kind === "image" ? ["image", "gif"] : kind === "story" ? ["image", "video"] : ["video"]}
                chosen={media.map((m) => m.id)}
                onPick={(asset) => d.setMedia((prev) => (kind === "image" ? [...prev, asset] : [asset]))}
              />
              {media.some((m) => m.kind !== "video") && (
                <div className="flex flex-col gap-3">
                  {media
                    .filter((m) => m.kind !== "video")
                    .map((m) => (
                      <AltTextField
                        key={m.id}
                        asset={m}
                        onSaved={(updated) => d.setMedia((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                      />
                    ))}
                </div>
              )}
              {media.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {media.map((m) => (
                    <div key={m.id} className="group relative h-20 w-20 overflow-hidden border border-hair">
                      {m.kind === "video" ? (
                        <video src={mediaUrl(m.file)} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={mediaUrl(m.file)} alt={m.alt_text || ""} className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${m.alt_text || "this file"}`}
                        onClick={() => d.setMedia((prev) => prev.filter((x) => x.id !== m.id))}
                        className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center bg-ink text-[13px] text-page"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Dropzone>
          )}

          <div>
            <TextareaField
              rows={kind === "text" ? 6 : 3}
              label={isMediaKind ? "Caption" : d.threadParts.length ? "Part 1" : "Post"}
              placeholder={isMediaKind ? "Say something about it…" : "Write the thought once…"}
              value={d.text}
              autoFocus={kind === "text"}
              onChange={(e) => d.setText(e.target.value)}
              errors={saveError?.fieldErrors.base_text}
            />
            <CharCounts channels={d.selectedChannels} text={d.text} overrides={d.overrides} connectors={d.connectorBySlug} />
          </div>

          {d.threadChannels.length > 0 && (
            <ThreadParts
              parts={d.threadParts}
              onChange={d.setThreadParts}
              maxLength={d.threadMax}
              networks={d.threadChannels.map((c) => c.display_name)}
            />
          )}

          <AiPanel
            text={d.text}
            channels={d.selectedChannels}
            overrides={d.overrides}
            onOverrides={d.setOverrides}
            onText={d.setText}
            media={media}
            onMedia={d.setMedia}
            kind={kind!}
          />

          {d.supportsLink && (
            <Field
              label="Link (optional)"
              type="url"
              placeholder="https://"
              value={d.link}
              onChange={(e) => d.setLink(e.target.value)}
              errors={saveError?.fieldErrors.link}
            />
          )}

          {d.commentChannels.length > 0 && (
            <TextareaField
              rows={2}
              label="First comment (optional)"
              placeholder="Posted as a reply right after: a good place for the link"
              value={d.firstComment}
              onChange={(e) => d.setFirstComment(e.target.value)}
              hint={`On ${d.commentChannels.map((c) => c.display_name).join(", ")}.`}
            />
          )}

          <div>
            <div className="eyebrow mb-3">Publish to</div>
            {d.channels.isLoading ? (
              <p className="text-[13px] text-ink-55">Loading channels…</p>
            ) : d.eligible.length ? (
              <div className="flex flex-wrap gap-2">
                {d.eligible.map((c) => (
                  <ChannelToggle key={c.id} channel={c} selected={d.selected.includes(c.id)} onToggle={() => d.toggleChannel(c.id)} />
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-ink-55">
                No connected channel takes {kindLabel(kind).toLowerCase()} posts.{" "}
                <Link
                  to="/app/connections"
                  onClick={() => onOpenChange(false)}
                  className="text-ink underline underline-offset-4 hover:text-rust"
                >
                  Connect one
                </Link>
                , or save the draft and choose later.
              </p>
            )}
          </div>

          <Field
            label="Send at (optional)"
            type="datetime-local"
            value={d.scheduled}
            onChange={(e) => d.setScheduled(e.target.value)}
            hint={
              d.reviewFirst
                ? "Approval is on: the post goes to review first."
                : d.inFuture
                  ? `It goes out at this time, ${timeZoneLabel()} time (the workspace's zone).`
                  : "Leave empty to publish now, or pick a time."
            }
            errors={saveError?.fieldErrors.scheduled_for}
          />

          {d.mediaLoadFailed && (
            <p role="alert" className="text-[13px] text-rust">
              This draft's media didn't load, so saving is off to keep it attached. Close and try again.
            </p>
          )}

          <Findings channels={d.selectedChannels} results={d.findings.map((f) => f.data)} validating={d.validating} />

          {saveError && !Object.keys(saveError.fieldErrors).some((k) => ["base_text", "link", "scheduled_for"].includes(k)) && (
            <p role="alert" className="text-[13px] text-rust">
              {saveError.detail}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
