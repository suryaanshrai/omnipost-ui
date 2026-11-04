import { expect, test } from "@playwright/test"

// One new user from sign-up to a dispatched post, plus the account pages.
// Needs the API (with a worker) and the UI running; see README "Tests".

const user = `e2e${Date.now()}`
const password = "Correct-horse-battery-9"

test("sign up, connect an account, publish, manage the account", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Placeholder tiers")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: /One post/ }).first()).toBeVisible()

  // Sign up
  await page.goto("/register")
  await page.getByLabel("Username").fill(user)
  await page.getByLabel("Email").fill(`${user}@example.com`)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByLabel("Confirm password").fill("not the same")
  await expect(page.getByText("The passwords don't match.")).toBeVisible()
  await page.getByLabel("Confirm password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()

  // First screen: the checklist, not an empty list
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByText("Three steps to your first delivered post.")).toBeVisible()

  // Connect a Mastodon account with pasted credentials
  await page.getByRole("link", { name: "Connect", exact: true }).click()
  await expect(page).toHaveURL(/\/app\/connections$/)
  await page.getByRole("button", { name: "Connect Mastodon" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: /paste|credential|token/i }).first().click()
  await dialog.getByLabel("Access token").fill("e2e-token")
  await dialog.getByLabel("Instance domain").fill("mastodon.e2e-example.org")
  await dialog.getByRole("button", { name: /^Connect$/ }).click()
  await expect(page.getByText(/connected/)).toBeVisible()

  // Compose and publish now
  await page.goto("/app")
  await page.getByRole("button", { name: "Compose", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: /Text/ }).click()
  await page.getByRole("dialog").getByLabel("Post", { exact: true }).fill("Hello from the smoke test")
  await page.getByRole("dialog").getByRole("checkbox", { name: "Mastodon" }).click()
  const publish = page.getByRole("button", { name: "Publish now" })
  await expect(publish).toBeEnabled({ timeout: 10_000 })
  await publish.click()
  // Wait for the server to accept it, not just for the click.
  await expect(page.getByText(/Publishing now/)).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const entry = page.locator("article", { hasText: "Hello from the smoke test" })
  await expect(entry).toBeVisible()
  await entry.getByRole("button", { name: /Delivery/ }).click()
  // The worker tried to publish (the instance doesn't exist, so it records a failure or retry).
  await expect(entry.getByText(/Attempt|Queued|Running|Waiting|Failed|failed|retry/i).first()).toBeVisible({
    timeout: 20_000,
  })

  // Settings: account block
  await page.goto("/app/settings")
  await expect(page.getByText("Your account")).toBeVisible()
  await expect(page.getByLabel(/Email me when a post fails/)).toBeChecked()
  await expect(page.getByRole("button", { name: "Download my data" })).toBeVisible()

  // Sign out, then forgot password
  await page.getByRole("button", { name: "Exit" }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole("link", { name: "Forgot password?" }).click()
  await page.getByLabel("Email").fill(`${user}@example.com`)
  await page.getByRole("button", { name: "Send reset link" }).click()
  await expect(page.getByText(/reset link is on its way/)).toBeVisible()
})

test("signed-out visits to the app return there after sign-in @mobile", async ({ page }) => {
  await page.goto("/app/settings")
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fsettings/)
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible()
})
