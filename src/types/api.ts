// Convenience aliases over the generated src/types/schema.d.ts
// (`npm run gen:api`, from omnipost-api's committed schema.yml — see that
// script and src/lib/api.ts). Referencing `components["schemas"]["X"]"`
// directly at every call site works but reads poorly; each phase adds the
// aliases its own screens need here rather than hand-mirroring backend
// models the way the old src/types.ts did, which is what let this app's
// entire data layer silently rot against a backend that had moved on.
import type { components } from "./schema"

export type Workspace = components["schemas"]["Workspace"]
export type Connector = components["schemas"]["Connector"]
export type MediaRule = components["schemas"]["MediaRule"]
export type Channel = components["schemas"]["Channel"]
export type ChannelHealth = components["schemas"]["ChannelHealthEnum"]
export type Post = components["schemas"]["Post"]
export type PostKind = components["schemas"]["PostKindEnum"]
export type PostStatus = components["schemas"]["PostStatusEnum"]
export type PostTarget = components["schemas"]["PostTarget"]
export type PostTargetStatus = components["schemas"]["PostTargetStatusEnum"]
export type PostTargetWrite = components["schemas"]["PostTargetWrite"]
export type PublishAttempt = components["schemas"]["PublishAttempt"]
export type MediaAsset = components["schemas"]["MediaAsset"]
export type ValidateResult = components["schemas"]["ValidateResult"]
export type ValidateFinding = components["schemas"]["ValidateFinding"]
export type AppCredential = components["schemas"]["AppCredential"]
export type OAuthStartResult = components["schemas"]["OAuthStartResult"]
export type QueueSlot = components["schemas"]["QueueSlot"]
export type BestTime = components["schemas"]["BestTime"]
export type BlackoutWindow = components["schemas"]["BlackoutWindow"]
export type RecurrenceRule = components["schemas"]["RecurrenceRule"]
export type ImportCsvResult = components["schemas"]["ImportCsvResult"]
export type PostMetric = components["schemas"]["PostMetric"]
export type PostPerformanceEntry = components["schemas"]["PostPerformanceEntry"]
export type Membership = components["schemas"]["Membership"]
export type VoiceProfile = components["schemas"]["VoiceProfile"]
export type ProviderKey = components["schemas"]["ProviderKey"]
export type AIUsage = components["schemas"]["AIUsage"]
export type GenerateVariantsResult = components["schemas"]["GenerateVariantsResult"]
export type RepurposeResult = components["schemas"]["RepurposeResult"]
export type AltTextResult = components["schemas"]["AltTextResult"]
export type UserDetails = components["schemas"]["UserDetails"]
export type Token = components["schemas"]["Token"]
export type CalendarEntry = components["schemas"]["CalendarEntry"]
export type AIProvider = components["schemas"]["AIProviderEnum"]
export type AspectRatio = components["schemas"]["AspectEnum"]
