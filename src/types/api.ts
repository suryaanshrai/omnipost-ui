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
