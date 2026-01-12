import puppeteer, { Browser, Page } from "puppeteer";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const SCREENSHOTS_DIR = path.join(process.cwd(), "__tests__", "screenshots");
const LIGHTHOUSE_DIR = path.join(
  process.cwd(),
  "__tests__",
  "integration",
  "lighthouse",
  "reports",
);

// Ensure directories exist
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}
if (!fs.existsSync(LIGHTHOUSE_DIR)) {
  fs.mkdirSync(LIGHTHOUSE_DIR, { recursive: true });
}

export type TestResult = {
  screenshotPath: string;
  lighthouseReportPath?: string;
  lighthouseScore?: number;
}

/**
 * Sets up a browser instance for testing
 */
export async function setupBrowser(): Promise<Browser> {
  return await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

/**
 * Navigates to a page and takes a screenshot
 */
export async function takeScreenshot(
  page: Page,
  url: string,
  filename: string,
): Promise<string> {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

  // Wait for main content to load
  await page
    .waitForSelector("main, [role='main']", { timeout: 10000 })
    .catch(() => {
      // Continue even if main selector not found
    });

  const screenshotPath = path.join(SCREENSHOTS_DIR, `${filename}.png`);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return screenshotPath;
}

/**
 * Runs Lighthouse audit on a page
 */
export async function runLighthouse(
  url: string,
  page: Page,
  filename: string,
): Promise<{ reportPath: string; score: number }> {
  const browser = await page.browser();
  const browserWSEndpoint = browser.wsEndpoint();

  // Extract port from WebSocket endpoint
  // Format: ws://127.0.0.1:PORT/devtools/browser/...
  const portMatch = browserWSEndpoint.match(/:\d+/);
  const port = portMatch ? parseInt(portMatch[0].substring(1)) : undefined;

  // Use dynamic import for lighthouse since it uses ESM
  const lighthouse = (await import("lighthouse")).default;

  const { lhr } = await lighthouse(url, {
    port: port,
    output: "html",
    logLevel: "info",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  });

  const reportPath = path.join(LIGHTHOUSE_DIR, `${filename}.html`);
  fs.writeFileSync(reportPath, lhr.report as string);

  // Calculate average score
  const categories = lhr.categories;
  const scores = [
    categories.performance?.score,
    categories.accessibility?.score,
    categories["best-practices"]?.score,
    categories.seo?.score,
  ].filter((score): score is number => score !== undefined);

  const averageScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
      : 0;

  return { reportPath, score: averageScore };
}

/**
 * Tests an admin page with screenshot and Lighthouse audit
 */
export async function testAdminPage(
  page: Page,
  route: string,
  moduleName: string,
): Promise<TestResult> {
  const url = `${BASE_URL}${route}`;
  const filename = `admin-${moduleName}-${Date.now()}`;

  console.log(`Testing ${moduleName} at ${url}`);

  // Take screenshot
  const screenshotPath = await takeScreenshot(page, url, filename);

  // Run Lighthouse audit
  let lighthouseReportPath: string | undefined;
  let lighthouseScore: number | undefined;

  try {
    const { reportPath, score } = await runLighthouse(url, page, filename);
    lighthouseReportPath = reportPath;
    lighthouseScore = score;
    console.log(`Lighthouse score for ${moduleName}: ${score}/100`);
  } catch (error) {
    console.warn(`Lighthouse audit failed for ${moduleName}:`, error);
  }

  return {
    screenshotPath,
    lighthouseReportPath,
    lighthouseScore,
  };
}

/**
 * Authenticates as admin user (if needed)
 * This is a placeholder - adjust based on your auth setup
 */
export async function authenticateAsAdmin(page: Page): Promise<void> {
  // Navigate to signin page
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "networkidle2" });

  // Fill in admin credentials
  // Adjust selectors based on your signin form
  const emailInput = await page.waitForSelector(
    'input[type="email"], input[name="email"]',
    { timeout: 5000 },
  );
  const passwordInput = await page.waitForSelector(
    'input[type="password"], input[name="password"]',
    { timeout: 5000 },
  );

  if (emailInput && passwordInput) {
    await emailInput.type("admin@example.com");
    await passwordInput.type("admin123");

    // Submit form
    const submitButton = await page.$(
      'button[type="submit"], button:has-text("Sign In")',
    );
    if (submitButton) {
      await submitButton.click();
      // Wait for navigation after signin
      await page
        .waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 })
        .catch(() => {});
    }
  }
}
