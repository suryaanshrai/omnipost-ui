import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"
import { writeFileSync } from "node:fs"

// An axe-core scan of every screen in Day and Night, written as JSON for
// comparing before and after a UI change. Report only: it runs when A11Y_OUT
// names a file, e.g.
//   A11Y_OUT=/tmp/a11y.json npx playwright test e2e/a11y.spec.ts --project=desktop
// Needs the API and the UI running, like the smoke test.

const out = process.env.A11Y_OUT
test.skip(!out, "set A11Y_OUT to a file to write the report into")

const user = `a11y${Date.now()}`
const password = "Correct-horse-battery-9"

type Violation = { id: string; impact: string | null; nodes: number; targets: string[] }

async function scan(page: Page): Promise<Violation[]> {
  // Let entrance animations finish: half-faded text reads as low contrast.
  await page.waitForTimeout(1500)
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
  return result.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? null,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
  }))
}

test("scan every screen @a11y", async ({ page }) => {
  test.setTimeout(5 * 60_000)
  const report: Record<string, Violation[]> = {}

  for (const route of ["/", "/login", "/register", "/forgot-password", "/nope"]) {
    await page.goto(route)
    report[`public ${route}`] = await scan(page)
  }

  await page.goto("/register")
  await page.getByLabel("Username").fill(user)
  await page.getByLabel("Email").fill(`${user}@example.com`)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByLabel("Confirm password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/app$/)

  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => localStorage.setItem("vite-ui-theme", t), theme)
    for (const route of [
      "/app",
      "/app/drafts",
      "/app/calendar",
      "/app/connections",
      "/app/analytics",
      "/app/settings",
      "/app/settings?tab=workspace",
    ]) {
      await page.goto(route)
      report[`${theme} ${route}`] = await scan(page)
    }
    await page.goto("/app/connections")
    await page.getByRole("button", { name: "Connect Bluesky" }).click()
    report[`${theme} dialog connect`] = await scan(page)
    await page.keyboard.press("Escape")
    await page.goto("/app")
    await page.getByRole("button", { name: /Compose/ }).first().click()
    await page.getByRole("dialog").getByRole("button", { name: /Text/ }).click()
    report[`${theme} dialog compose`] = await scan(page)
  }

  writeFileSync(out!, JSON.stringify(report, null, 2))
})
