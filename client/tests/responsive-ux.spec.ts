import { expect, test, type Page, type TestInfo } from "@playwright/test"

type ViewportName = "mobile" | "tablet" | "desktop"

type AuditIssue = {
  type: string
  message: string
  selector?: string
}

type RouteConfig = {
  path: string
  kind: "public" | "dashboard"
}

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.E2E_BASE_URL ??
  "http://localhost:3000"

const routes: RouteConfig[] = [
  { path: "/", kind: "public" },
  { path: "/login", kind: "public" },
  { path: "/register", kind: "public" },
  { path: "/forgot-password", kind: "public" },
  { path: "/dashboard", kind: "dashboard" },
  { path: "/dashboard/cvs", kind: "dashboard" },
  { path: "/dashboard/analysis", kind: "dashboard" },
  { path: "/dashboard/job-match", kind: "dashboard" },
  { path: "/dashboard/cover-letters", kind: "dashboard" },
  { path: "/dashboard/history", kind: "dashboard" },
  { path: "/dashboard/profile", kind: "dashboard" },
]

const viewports: Record<ViewportName, { width: number; height: number }> = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
}

const seriousConsoleTypes = new Set(["error"])
const ignoredConsolePatterns = [
  /Failed to load resource: the server responded with a status of 404/i,
  /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/i,
  /favicon/i,
]

for (const [viewportName, viewport] of Object.entries(viewports) as [
  ViewportName,
  { width: number; height: number },
][]) {
  test.describe(`responsive UX audit - ${viewportName}`, () => {
    test.use({ baseURL, viewport })

    for (const route of routes) {
      test(`${route.path}`, async ({ page }, testInfo) => {
        const issues: AuditIssue[] = []
        collectRuntimeIssues(page, issues)

        if (route.kind === "dashboard") {
          await ensureDashboardAuth(page, testInfo)
        }

        const response = await page.goto(route.path, {
          waitUntil: "domcontentloaded",
        })

        if (!response) {
          issues.push({
            type: "page-load",
            message: "Navigation did not return a response.",
          })
        } else if (response.status() >= 500) {
          issues.push({
            type: "page-load",
            message: `Route returned HTTP ${response.status()}.`,
          })
        }

        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(
          () => {
            issues.push({
              type: "page-load",
              message: "Route did not reach network idle within 10s.",
            })
          },
        )

        if (route.kind === "dashboard" && /\/login(?:$|\?)/.test(page.url())) {
          issues.push({
            type: "auth",
            message: "Dashboard route redirected to login after auth setup.",
          })
        }

        await expect(page.locator("body")).toBeVisible()

        issues.push(...(await auditDocumentLayout(page)))
        issues.push(...(await auditControls(page)))
        issues.push(...(await auditForms(page)))
        issues.push(...(await auditHeaderAndSidebar(page, viewportName)))

        if (route.kind === "dashboard") {
          issues.push(...(await auditDashboardPage(page)))
        }

        await failWithReportIfNeeded(page, testInfo, route.path, viewportName, issues)
      })
    }
  })
}

function collectRuntimeIssues(page: Page, issues: AuditIssue[]) {
  page.on("console", (message) => {
    if (!seriousConsoleTypes.has(message.type())) {
      return
    }

    const text = message.text()

    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) {
      return
    }

    issues.push({
      type: "console-error",
      message: text,
    })
  })

  page.on("pageerror", (error) => {
    issues.push({
      type: "uncaught-exception",
      message: error.message,
    })
  })
}

async function ensureDashboardAuth(page: Page, testInfo: TestInfo) {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD

  if (!email || !password) {
    testInfo.annotations.push({
      type: "skip-dashboard-auth",
      description:
        "Set E2E_EMAIL and E2E_PASSWORD to include dashboard routes in this audit.",
    })
    test.skip(true, "Dashboard audit skipped because E2E_EMAIL/E2E_PASSWORD are not set.")
    return
  }

  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.getByLabel(/^email$/i).fill(email)
  await page.getByLabel(/^password$/i).fill(password)
  await page.getByRole("button", { name: /log in|sign in/i }).click()

  try {
    await page.waitForURL(/\/dashboard(?:\/.*)?$/, { timeout: 15_000 })
  } catch {
    test.skip(true, "Dashboard audit skipped because test login did not complete.")
  }
}

async function auditDocumentLayout(page: Page): Promise<AuditIssue[]> {
  return page.evaluate(() => {
    const issues: AuditIssue[] = []
    const getElementSelector = (element: Element) => {
      const tag = element.tagName.toLowerCase()
      const id = element.id ? `#${element.id}` : ""
      const role = element.getAttribute("role")
      const ariaLabel = element.getAttribute("aria-label")
      const dataSlot = element.getAttribute("data-slot")

      if (id) {
        return `${tag}${id}`
      }

      if (ariaLabel) {
        return `${tag}[aria-label="${ariaLabel}"]`
      }

      if (role) {
        return `${tag}[role="${role}"]`
      }

      if (dataSlot) {
        return `${tag}[data-slot="${dataSlot}"]`
      }

      return tag
    }

    const isVisible = (element: Element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      )
    }

    const findLikelyOverlaps = () => {
      const overlapIssues: AuditIssue[] = []
      const elements = Array.from(
        document.querySelectorAll(
          "main button, main a[href], main input, main textarea, main select, main [class*='card' i], main [class*='panel' i]",
        ),
      ).filter(isVisible)

      for (let firstIndex = 0; firstIndex < elements.length; firstIndex += 1) {
        const first = elements[firstIndex]
        const firstRect = first.getBoundingClientRect()

        for (
          let secondIndex = firstIndex + 1;
          secondIndex < Math.min(elements.length, firstIndex + 18);
          secondIndex += 1
        ) {
          const second = elements[secondIndex]

          if (first.contains(second) || second.contains(first)) {
            continue
          }

          const secondRect = second.getBoundingClientRect()
          const overlapX =
            Math.min(firstRect.right, secondRect.right) -
            Math.max(firstRect.left, secondRect.left)
          const overlapY =
            Math.min(firstRect.bottom, secondRect.bottom) -
            Math.max(firstRect.top, secondRect.top)

          if (overlapX > 8 && overlapY > 8) {
            overlapIssues.push({
              type: "element-overlap",
              message: "Two visible main-content elements overlap.",
              selector: `${getElementSelector(first)} / ${getElementSelector(second)}`,
            })
          }

          if (overlapIssues.length >= 5) {
            return overlapIssues
          }
        }
      }

      return overlapIssues
    }

    const viewportWidth = window.innerWidth
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    )

    if (documentWidth > viewportWidth + 4) {
      issues.push({
        type: "horizontal-overflow",
        message: `Document width ${documentWidth}px exceeds viewport ${viewportWidth}px.`,
        selector: "html",
      })
    }

    const selectors = [
      "main",
      "header",
      "nav",
      "aside",
      "section",
      "article",
      "form",
      "table",
      "[role='main']",
      "[class*='card' i]",
      "[class*='panel' i]",
      "[class*='breadcrumb' i]",
    ]

    for (const element of Array.from(document.querySelectorAll(selectors.join(",")))) {
      const style = window.getComputedStyle(element)

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      ) {
        continue
      }

      const rect = element.getBoundingClientRect()

      if (rect.width <= 0 || rect.height <= 0) {
        continue
      }

      if (rect.right > viewportWidth + 4 || rect.left < -4) {
        issues.push({
          type: "element-overflow",
          message: `Element bounds left=${Math.round(rect.left)} right=${Math.round(
            rect.right,
          )} exceed viewport width ${viewportWidth}px.`,
          selector: getElementSelector(element),
        })
      }
    }

    const main = document.querySelector("main, [role='main']")

    if (main) {
      const rect = main.getBoundingClientRect()

      if (rect.width > 0 && rect.width < Math.min(320, viewportWidth - 32)) {
        issues.push({
          type: "main-content-width",
          message: `Main content is narrow at ${Math.round(rect.width)}px.`,
          selector: getElementSelector(main),
        })
      }
    }

    issues.push(...findLikelyOverlaps())

    return issues.slice(0, 25)
  })
}

async function auditControls(page: Page): Promise<AuditIssue[]> {
  return page.evaluate(() => {
    const issues: AuditIssue[] = []
    const getElementSelector = (element: Element) => {
      const tag = element.tagName.toLowerCase()
      const id = element.id ? `#${element.id}` : ""
      const ariaLabel = element.getAttribute("aria-label")
      const role = element.getAttribute("role")

      if (id) {
        return `${tag}${id}`
      }

      if (ariaLabel) {
        return `${tag}[aria-label="${ariaLabel}"]`
      }

      if (role) {
        return `${tag}[role="${role}"]`
      }

      return tag
    }
    const viewportWidth = window.innerWidth
    const controls = Array.from(
      document.querySelectorAll("button, a[href], input, select, textarea, [role='button']"),
    )

    for (const control of controls) {
      const style = window.getComputedStyle(control)

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0 ||
        control.closest("[aria-hidden='true']")
      ) {
        continue
      }

      const rect = control.getBoundingClientRect()

      if (rect.width <= 0 || rect.height <= 0) {
        continue
      }

      if (rect.left < -4 || rect.right > viewportWidth + 4) {
        issues.push({
          type: "control-overflow",
          message: `Control exceeds viewport bounds: left=${Math.round(
            rect.left,
          )}, right=${Math.round(rect.right)}.`,
          selector: getElementSelector(control),
        })
      }

    }

    return issues.slice(0, 20)
  })
}

async function auditForms(page: Page): Promise<AuditIssue[]> {
  return page.evaluate(() => {
    const issues: AuditIssue[] = []
    const getElementSelector = (element: Element) => {
      const tag = element.tagName.toLowerCase()
      const id = element.id ? `#${element.id}` : ""
      const ariaLabel = element.getAttribute("aria-label")
      const name = element.getAttribute("name")

      if (id) {
        return `${tag}${id}`
      }

      if (ariaLabel) {
        return `${tag}[aria-label="${ariaLabel}"]`
      }

      if (name) {
        return `${tag}[name="${name}"]`
      }

      return tag
    }

    for (const form of Array.from(document.querySelectorAll("form"))) {
      const formRect = form.getBoundingClientRect()

      if (formRect.width <= 0 || formRect.height <= 0) {
        continue
      }

      for (const field of Array.from(
        form.querySelectorAll("input, textarea, select, button"),
      )) {
        const style = window.getComputedStyle(field)
        const rect = field.getBoundingClientRect()

        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width <= 0 ||
          rect.height <= 0
        ) {
          issues.push({
            type: "form-control-hidden",
            message: "A form control is hidden or has no rendered size.",
            selector: getElementSelector(field),
          })
          continue
        }

        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }
        const topElement = document.elementFromPoint(center.x, center.y)

        if (topElement && !field.contains(topElement) && !topElement.contains(field)) {
          issues.push({
            type: "form-control-obscured",
            message: "A form control appears to be covered by another element.",
            selector: getElementSelector(field),
          })
        }
      }
    }

    return issues.slice(0, 20)
  })
}

async function auditHeaderAndSidebar(
  page: Page,
  viewportName: ViewportName,
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const sidebar = page.locator("aside[aria-label='Dashboard navigation']").first()
  const hasSidebar = (await sidebar.count()) > 0

  if (!hasSidebar) {
    return issues
  }

  if (viewportName === "desktop") {
    const sidebarBox = await sidebar.boundingBox()
    const mainBox = await page.locator("main").first().boundingBox()

    if (!sidebarBox || sidebarBox.width < 180) {
      issues.push({
        type: "sidebar-desktop",
        message: "Desktop sidebar is missing or too narrow.",
        selector: "aside[aria-label='Dashboard navigation']",
      })
    }

    if (sidebarBox && mainBox && mainBox.x < sidebarBox.x + sidebarBox.width - 4) {
      issues.push({
        type: "sidebar-overlap",
        message: "Desktop main content starts underneath the sidebar.",
        selector: "main",
      })
    }
  }

  if (viewportName === "mobile") {
    const initialBox = await sidebar.boundingBox()

    if (initialBox && initialBox.x > -4 && initialBox.width > 120) {
      issues.push({
        type: "sidebar-mobile",
        message: "Mobile sidebar occupies the screen by default.",
        selector: "aside[aria-label='Dashboard navigation']",
      })
    }

    const trigger = page.getByRole("button", { name: /open navigation/i }).first()

    if ((await trigger.count()) === 0 || !(await trigger.isVisible())) {
      issues.push({
        type: "mobile-menu-trigger",
        message: "Mobile navigation trigger is missing or hidden.",
        selector: "button[aria-label='Open navigation']",
      })
      return issues
    }

    await trigger.click()
    await page.waitForTimeout(250)

    const openBox = await sidebar.boundingBox()

    if (!openBox || openBox.x < -20 || openBox.width < 180) {
      issues.push({
        type: "mobile-drawer-open",
        message: "Mobile navigation drawer did not open into view.",
        selector: "aside[aria-label='Dashboard navigation']",
      })
    }

    const close = page.getByRole("button", { name: /close navigation/i }).first()

    if ((await close.count()) > 0 && (await close.isVisible())) {
      await close.click()
      await page.waitForTimeout(250)
      const closedBox = await sidebar.boundingBox()

      if (closedBox && closedBox.x > -4 && closedBox.width > 120) {
        issues.push({
          type: "mobile-drawer-close",
          message: "Mobile navigation drawer did not close.",
          selector: "aside[aria-label='Dashboard navigation']",
        })
      }
    } else {
      issues.push({
        type: "mobile-drawer-close",
        message: "Mobile navigation close control is missing or hidden.",
        selector: "button[aria-label='Close navigation']",
      })
    }
  }

  return issues
}

async function auditDashboardPage(page: Page): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const header = page.locator("main h1, main [data-slot='page-header'] h1").first()

  if ((await header.count()) === 0 || !(await header.isVisible())) {
    issues.push({
      type: "dashboard-header",
      message: "Dashboard page header is missing or not visible.",
      selector: "main h1",
    })
  }

  const primaryActions = page.locator(
    "main button:visible, main a[href]:visible, main input[type='file']:visible",
  )

  if ((await primaryActions.count()) === 0) {
    issues.push({
      type: "dashboard-actions",
      message: "Dashboard route has no visible action, link, or file input in main content.",
      selector: "main",
    })
  }

  return issues
}

async function failWithReportIfNeeded(
  page: Page,
  testInfo: TestInfo,
  route: string,
  viewportName: ViewportName,
  issues: AuditIssue[],
) {
  if (issues.length === 0) {
    return
  }

  const screenshotPath = testInfo.outputPath(
    "responsive-ux",
    `${sanitize(route)}-${viewportName}.png`,
  )
  await page.screenshot({ fullPage: true, path: screenshotPath })
  issues.push({
    type: "screenshot",
    message: screenshotPath,
  })

  const report = issues
    .map((issue) => {
      const selector = issue.selector ? `\n    selector: ${issue.selector}` : ""

      return `- ${issue.type}: ${issue.message}${selector}`
    })
    .join("\n")

  expect(
    issues.filter((issue) => issue.type !== "screenshot"),
    `Responsive UX audit failed for route=${route}, viewport=${viewportName}\nScreenshot: ${screenshotPath}\n${report}`,
  ).toEqual([])
}

function sanitize(route: string) {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "__")
}
