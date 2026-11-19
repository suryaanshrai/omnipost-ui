import { expect, test, type Page } from "@playwright/test"

// Screenshots of every screen, for comparing a UI change against a baseline
// by eye. Not a pass/fail test: it only runs when VISUAL_OUT names a folder
// to write into, e.g.
//   VISUAL_OUT=/tmp/shots/before npx playwright test e2e/visual.spec.ts --project=desktop
// Needs the API (with a worker) and the UI running, like the smoke test.

const out = process.env.VISUAL_OUT
test.skip(!out, "set VISUAL_OUT to a folder to write screenshots into")
test.describe.configure({ mode: "serial" })

const user = `vis${Date.now()}`
const password = "Correct-horse-battery-9"
const sizes = [
  { name: "375", width: 375, height: 812 },
  { name: "1280", width: 1280, height: 860 },
] as const
const themes = ["light", "dark"] as const

// Calls the API from inside the page, so the session cookie and client
// header are the app's own.
async function api<T>(page: Page, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  return page.evaluate(
    async ({ path, init }) => {
      const base = window.__OMNIPOST_CONFIG__?.apiUrl || "http://localhost:18000"
      const res = await fetch(`${base}${path}`, {
        method: init?.method ?? "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-OmniPost-Client": "web" },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`${res.status} ${path}: ${text}`)
      return text ? JSON.parse(text) : null
    },
    { path, init },
  ) as Promise<T>
}

async function shoot(page: Page, name: string) {
  // Let entrance animations and reveals settle so diffs show layout, not timing.
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true, animations: "disabled" })
}

async function setTheme(page: Page, theme: (typeof themes)[number]) {
  await page.evaluate((t) => localStorage.setItem("vite-ui-theme", t), theme)
}

test("capture every screen @visual", async ({ page }) => {
  test.setTimeout(10 * 60_000)

  // Public pages, before signing in.
  for (const size of sizes) {
    await page.setViewportSize(size)
    for (const [route, label] of [
      ["/", "landing"],
      ["/login", "login"],
      ["/register", "register"],
      ["/forgot-password", "forgot"],
      ["/nope", "notfound"],
    ] as const) {
      await page.goto(route)
      await shoot(page, `${label}-${size.name}`)
    }
  }

  // One account with a channel, drafts, a failed post and calendar entries.
  await page.setViewportSize(sizes[1])
  await page.goto("/register")
  await page.getByLabel("Username").fill(user)
  await page.getByLabel("Email").fill(`${user}@example.com`)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByLabel("Confirm password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/app$/)
  await shoot(page, "app-empty-1280")

  const workspaces = await api<{ results: { id: number }[] }>(page, "/workspaces/")
  const workspace = workspaces.results[0].id
  const channel = await api<{ id: number }>(page, "/channels/", {
    method: "POST",
    body: {
      workspace,
      connector_slug: "mastodon",
      display_name: "Mastodon",
      credentials: { ACCESS_TOKEN: "visual-token", INSTANCE_DOMAIN: "mastodon.visual-example.org" },
    },
  })
  const texts = [
    "A draft that waits for the right hour. https://example.com/a/very/long/link/that/should/wrap/instead/of/overflowing/the/column/and/breaking/layout",
    "Second draft, shorter.",
  ]
  for (const base_text of texts) {
    await api(page, "/posts/", {
      method: "POST",
      body: { workspace, kind: "text", base_text, target_specs: [{ channel: channel.id }] },
    })
  }
  const toPublish = await api<{ id: number }>(page, "/posts/", {
    method: "POST",
    body: { workspace, kind: "text", base_text: "Published (or failed) post for the delivery log.", target_specs: [{ channel: channel.id }] },
  })
  await api(page, `/posts/${toPublish.id}/schedule/`, { method: "POST", body: {} })
  const later = new Date(Date.now() + 26 * 3600_000).toISOString()
  const scheduled = await api<{ id: number }>(page, "/posts/", {
    method: "POST",
    body: { workspace, kind: "text", base_text: "Scheduled for tomorrow.", target_specs: [{ channel: channel.id }] },
  })
  await api(page, `/posts/${scheduled.id}/schedule/`, { method: "POST", body: { run_at: later } })
  await api(page, "/queue-slots/", { method: "POST", body: { channel: channel.id, weekday: 2, time_of_day: "09:30" } })
  await api(page, "/blackout-windows/", {
    method: "POST",
    body: {
      workspace,
      channel: null,
      starts_at: new Date(Date.now() + 2 * 86400_000).toISOString(),
      ends_at: new Date(Date.now() + 2.5 * 86400_000).toISOString(),
      reason: "Holiday",
    },
  })
  // Give the worker a moment to record the publish attempt.
  await page.waitForTimeout(4000)

  const screens = [
    ["/app", "posts"],
    ["/app/drafts", "drafts"],
    ["/app/calendar", "calendar"],
    ["/app/connections", "connections"],
    [`/app/connections/${channel.id}`, "channel"],
    ["/app/analytics", "analytics"],
    ["/app/settings", "settings-account"],
    ["/app/settings?tab=workspace", "settings-workspace"],
  ] as const

  for (const theme of themes) {
    await setTheme(page, theme)
    for (const size of sizes) {
      await page.setViewportSize(size)
      for (const [route, label] of screens) {
        await page.goto(route)
        await shoot(page, `${label}-${theme}-${size.name}`)
      }

      // Overlays.
      await page.goto("/app/connections")
      await page.getByRole("button", { name: "Connect Bluesky" }).click()
      await shoot(page, `dialog-connect-${theme}-${size.name}`)
      await page.keyboard.press("Escape")

      // Removing a channel asks first (Drafts' Delete is undo-able instead, so it doesn't).
      await page.goto("/app/connections")
      await page.getByRole("button", { name: /^Remove/ }).first().click()
      await shoot(page, `dialog-confirm-${theme}-${size.name}`)
      await page.keyboard.press("Escape")

      await page.goto("/app")
      await page.getByRole("button", { name: /Compose/ }).first().click()
      await shoot(page, `compose-1-${theme}-${size.name}`)
      await page.getByRole("dialog").getByRole("button", { name: /Text/ }).click()
      await shoot(page, `compose-2-${theme}-${size.name}`)
      await page.keyboard.press("Escape")

      if (size.name === "375") {
        await page.goto("/app")
        await page.getByRole("button", { name: /menu/i }).first().click()
        await shoot(page, `sheet-${theme}-${size.name}`)
        await page.keyboard.press("Escape")
      }
    }
  }
})
