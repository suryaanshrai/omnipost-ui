import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Vitest runs without globals, so Testing Library can't register its own
// cleanup: unmount after every test here.
afterEach(cleanup)

// jsdom has <dialog> but not its modal API. A minimal stand-in, enough for
// components that call showModal()/close() and listen for "close".
// It also doesn't match :modal, so the stand-in tracks that itself.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  const modal = new WeakSet<Element>()
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "")
    modal.add(this)
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return
    this.removeAttribute("open")
    modal.delete(this)
    this.dispatchEvent(new Event("close"))
  }
  const matches = Object.getOwnPropertyDescriptor(Element.prototype, "matches")!.value as (this: Element, selector: string) => boolean
  HTMLDialogElement.prototype.matches = function (this: HTMLDialogElement, selector: string) {
    return selector === ":modal" ? modal.has(this) : matches.call(this, selector)
  }
}
