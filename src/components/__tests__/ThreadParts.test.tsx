import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import ThreadParts from "@/components/compose/ThreadParts"

afterEach(cleanup)

describe("ThreadParts", () => {
  it("starts a thread, edits a part and flags one that's too long", () => {
    const onChange = vi.fn()
    const { rerender } = render(<ThreadParts parts={[]} onChange={onChange} maxLength={10} networks={["Bluesky"]} />)
    fireEvent.click(screen.getByRole("button", { name: "Make it a thread" }))
    expect(onChange).toHaveBeenLastCalledWith([""])

    rerender(<ThreadParts parts={["hello world!"]} onChange={onChange} maxLength={10} networks={["Bluesky"]} />)
    expect(screen.getByLabelText("Part 2")).toHaveProperty("value", "hello world!")
    expect(screen.getByText("12 / 10").className).toMatch(/text-rust/)

    fireEvent.change(screen.getByLabelText("Part 2"), { target: { value: "short" } })
    expect(onChange).toHaveBeenLastCalledWith(["short"])
    fireEvent.click(screen.getByRole("button", { name: "Remove part" }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })
})
