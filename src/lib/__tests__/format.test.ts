import { describe, expect, it } from "vitest"
import { formatStamp, fromLocalInput, setDisplayTimeZone, toLocalInput, timeZoneLabel } from "@/lib/format"

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

describe("stamps", () => {
  it("adds the year only outside the current one", () => {
    setDisplayTimeZone("UTC")
    const now = new Date("2026-11-19T12:00:00Z")
    expect(formatStamp("2026-08-24T10:00:00Z", now)).toBe("Aug 24 · 10:00 AM")
    expect(formatStamp("2025-08-24T10:00:00Z", now)).toBe("Aug 24, 2025 · 10:00 AM")
    expect(formatStamp(null, now)).toBe("")
  })
})
