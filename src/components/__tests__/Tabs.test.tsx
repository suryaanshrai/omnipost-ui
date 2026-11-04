import { useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { TabPanel, Tabs } from "@/components/editorial/Tabs"

afterEach(cleanup)

function Example() {
  const [tab, setTab] = useState("a")
  return (
    <Tabs value={tab} onValueChange={setTab} label="Example" tabs={[{ value: "a", label: "First" }, { value: "b", label: "Second" }]}>
      <TabPanel value="a">Panel A</TabPanel>
      <TabPanel value="b">Panel B</TabPanel>
    </Tabs>
  )
}

describe("Tabs", () => {
  it("are real tabs: one in the tab order, arrows move between them", async () => {
    render(<Example />)
    const [first, second] = screen.getAllByRole("tab")
    expect(screen.getByRole("tablist", { name: "Example" })).toBeTruthy()
    expect(first.getAttribute("aria-selected")).toBe("true")
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel A")

    act(() => first.focus())
    expect(first.tabIndex).toBe(0)
    expect(second.tabIndex).toBe(-1)
    fireEvent.keyDown(first, { key: "ArrowRight" })
    // Radix moves focus on the next tick.
    await waitFor(() => expect(document.activeElement).toBe(second))
    expect(second.getAttribute("aria-selected")).toBe("true")
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel B")
  })
})
