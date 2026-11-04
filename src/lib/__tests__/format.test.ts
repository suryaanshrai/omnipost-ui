import { describe, expect, it } from "vitest"
import { fromLocalInput, toLocalInput, timeZoneLabel } from "@/lib/format"

describe("workspace time zone conversion", () => {
  it("reads a datetime-local value as wall time in the workspace zone", () => {
    expect(fromLocalInput("2030-01-15T09:00", "America/New_York")).toBe("2030-01-15T14:00:00.000Z")
    expect(fromLocalInput("2030-07-15T09:00", "America/New_York")).toBe("2030-07-15T13:00:00.000Z") // DST
    expect(fromLocalInput("2030-07-15T09:00", "Asia/Kolkata")).toBe("2030-07-15T03:30:00.000Z")
  })

  it("round-trips", () => {
    for (const tz of ["Europe/London", "America/Los_Angeles", "Australia/Sydney", "UTC"]) {
      const iso = fromLocalInput("2030-03-31T08:30", tz)!
      expect(toLocalInput(iso, tz)).toBe("2030-03-31T08:30")
    }
  })

  it("rejects junk and labels zones briefly", () => {
    expect(fromLocalInput("", "UTC")).toBeNull()
    expect(fromLocalInput("tomorrow", "UTC")).toBeNull()
    expect(timeZoneLabel("America/New_York")).toBe("New York")
  })
})
