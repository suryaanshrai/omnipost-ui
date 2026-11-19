import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import Modal from "@/components/editorial/Modal"
import { toast } from "@/lib/toast"

const sonner = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }))
vi.mock("sonner", () => ({ toast: sonner }))

function Harness({ veto = false }: { veto?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <span data-testid="state">{open ? "open" : "closed"}</span>
      <Modal open={open} onOpenChange={(o) => !veto && setOpen(o)} title="Hello" description="About it">
        <input aria-label="Name" />
      </Modal>
    </>
  )
}

describe("Modal on a native <dialog>", () => {
  it("opens as a dialog named by its title and described by its description", () => {
    render(<Harness />)
    const dialog = screen.getByRole("dialog", { name: "Hello" })
    expect(dialog.tagName).toBe("DIALOG")
    expect(dialog.hasAttribute("open")).toBe(true)
    expect(dialog.getAttribute("aria-describedby")).toBe(screen.getByText("About it").id)
  })

  it("asks the parent before closing on Escape, and stays open if it says no", () => {
    const { unmount } = render(<Harness veto />)
    const dialog = screen.getByRole("dialog")
    const cancel = new Event("cancel", { cancelable: true })
    act(() => {
      dialog.dispatchEvent(cancel)
    })
    expect(cancel.defaultPrevented).toBe(true)
    expect(screen.getByTestId("state").textContent).toBe("open")
    expect(dialog.hasAttribute("open")).toBe(true)
    unmount()

    render(<Harness />)
    act(() => {
      screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }))
    })
    expect(screen.getByTestId("state").textContent).toBe("closed")
  })

  it("has a visible Close button", async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.getByTestId("state").textContent).toBe("closed")
    // Unmounted once its (here: absent) exit transition is done.
    await act(async () => {})
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("holds toasts until the dialog closes, and shows errors inside it", () => {
    render(<Harness />)
    sonner.mockClear()
    act(() => toast("Saved"))
    expect(sonner).not.toHaveBeenCalled()

    act(() => toast.error("That didn't work"))
    expect(screen.getByRole("alert").textContent).toContain("That didn't work")
    expect(sonner.error).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(sonner).toHaveBeenCalledWith("Saved", undefined)
  })

  it("closing a nested dialog leaves the one under it alone", () => {
    function Nested() {
      const [outer, setOuter] = useState(true)
      const [inner, setInner] = useState(true)
      return (
        <Modal open={outer} onOpenChange={setOuter} title="Outer">
          <Modal open={inner} onOpenChange={setInner} title="Inner" />
        </Modal>
      )
    }
    render(<Nested />)
    act(() => {
      screen.getByRole("dialog", { name: "Inner" }).dispatchEvent(new Event("cancel", { cancelable: true }))
    })
    expect(screen.getByRole("dialog", { name: "Outer" }).hasAttribute("open")).toBe(true)
    expect(screen.queryByRole("dialog", { name: "Inner" })).toBeNull()
  })

  it("releases held toasts when the dialog is unmounted while open", () => {
    const { unmount } = render(<Harness />)
    sonner.mockClear()
    act(() => toast("Connected"))
    expect(sonner).not.toHaveBeenCalled()
    unmount()
    expect(sonner).toHaveBeenCalledWith("Connected", undefined)
  })
})
