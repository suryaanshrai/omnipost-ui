import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { TextButton } from "@/components/editorial/Buttons"
import { apiFetch } from "@/lib/api"
import { formatStamp } from "@/lib/format"
import { useWorkspace } from "@/lib/workspace"
import type { Post } from "@/types/api"

/** Evergreen: send a published post again, into each channel's next queue slot. */
export default function RepostButton({ post }: { post: Post }) {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const repost = useMutation({
    mutationFn: () => apiFetch<Post>(`/posts/${post.id}/repost/`, { method: "POST", body: { when: "queue" } }),
    onSuccess: (copy) => {
      void queryClient.invalidateQueries({ queryKey: ["posts", activeWorkspace.id] })
      void queryClient.invalidateQueries({ queryKey: ["calendar"] })
      toast(copy.status === "in_review" ? "Copy sent for review" : `Queued again for ${formatStamp(copy.scheduled_for)}`)
    },
  })
  return (
    <TextButton type="button" tone="muted" onClick={() => repost.mutate()} disabled={repost.isPending}>
      Post again
    </TextButton>
  )
}
