// Shared API types. These mirror the Django models in omnipost-api
// (omnipost_api/models.py) until a generated client replaces hand-written
// types entirely.

export type PostType = "TEXT" | "IMAGE" | "VIDEO" | "SHORT_FORM_VIDEO" | "STORY_IMAGE" | "STORY_VIDEO";

export interface PostConfigDetail {
  CAPTION?: string;
  IMAGE_URL?: string;
  TEXT?: string;
  VIDEO_URL?: string;
  POST_ID?: string;
  CONTAINER_ID?: string;
  // The backend's response_mapping can write arbitrary keys into this bag
  // (see variable_mapping in platform_configs/*.json), so keep this open.
  [key: string]: string | undefined;
}

export type PostConfigs = Record<string, PostConfigDetail>;

export interface Draft {
  id: number;
  user_id?: number;
  created_at: string;
  post_configs: PostConfigs;
  schedule: string | null;
  published: boolean;
  caption?: string;
  text?: string;
  image?: string;
  image_url?: string;
  video?: string;
  video_url?: string;
  post_type: PostType;
}

export type Post = Draft;

export interface PlatformInstance {
  id: number;
  platform: string;
  instance_name: string;
}

export interface PostNotification {
  id: number;
  notification: string;
  error: boolean;
  created_at: string;
}
