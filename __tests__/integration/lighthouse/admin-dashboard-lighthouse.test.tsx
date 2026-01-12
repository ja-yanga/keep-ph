/**
 * @jest-environment node
 */
import puppeteer, { type Browser, type Page } from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Helper to check if server is running
async function checkServerRunning(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.status < 500; // Any status < 500 means server is responding
  } catch {
    return false;
  }
}

// Type definitions for Lighthouse audit results
type LighthouseAudit = {
  id: string;
  title: string;
  score: number | null;
  numericValue?: number;
  details?: {
    type: string;
  };
};

/**
 * Lighthouse test for Admin Dashboard page
 *
 * Tests:
 * - Authenticates as admin user
 * - Runs Lighthouse audit on /admin/dashboard
 * - Displays all Lighthouse metrics
 */
describe("Admin Dashboard Lighthouse Audit", () => {
  let browser: Browser;
  let page: Page;
  const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
  const url = `${BASE_URL}/admin/dashboard`;
  const ADMIN_EMAIL = "admin1@example.com";
  const ADMIN_PASSWORD = "admin123";

  beforeAll(async () => {
    // Allow running in non-headless mode for visual debugging
    const headless = process.env.HEADLESS !== "false";
    browser = await puppeteer.launch({
      headless: headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it("should run Lighthouse audit and display metrics for admin dashboard", async () => {
    console.log(
      `\n🔍 Authenticating and running Lighthouse audit on: ${url}\n`,
    );

    // Check if server is running
    const serverRunning = await checkServerRunning(`${BASE_URL}/signin`);
    if (!serverRunning) {
      throw new Error(
        `Cannot connect to ${BASE_URL}. Please make sure the dev server is running (npm run dev)`,
      );
    }

    // Step 1: Authenticate as admin
    console.log("🔐 Authenticating as admin...");
    await page.goto(`${BASE_URL}/signin`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for form to be ready and inputs to render
    await page.waitForSelector("form", { timeout: 10000 });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for React/Mantine to render

    // Fill email input - try multiple selectors
    try {
      await page.waitForSelector('input:not([type="password"])', {
        timeout: 5000,
      });
      const emailInputs = await page.$$('input:not([type="password"])');
      if (emailInputs.length > 0) {
        await emailInputs[0].click({ clickCount: 3 });
        await emailInputs[0].type(ADMIN_EMAIL);
      }
    } catch {
      // Fallback: try typing directly
      await page.type('input:not([type="password"])', ADMIN_EMAIL, {
        delay: 50,
      });
    }

    // Fill password input
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(ADMIN_PASSWORD, { delay: 50 });
    }

    // Submit form
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await Promise.all([
        page
          .waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 })
          .catch(() => {}),
        submitButton.click(),
      ]).catch(() => {
        // Navigation might have already happened
      });
    }

    // Wait a bit for authentication to complete and check if we're redirected
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if we're still on signin page (auth failed) or redirected
    const currentUrl = page.url();
    if (currentUrl.includes("/signin")) {
      console.warn("⚠️  Still on signin page - authentication may have failed");
    } else {
      console.log(`✅ Authenticated, redirected to: ${currentUrl}`);
    }

    // Get cookies before navigating (they're set after login)
    const cookies = await page.cookies();
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Navigate to admin dashboard to ensure we're authenticated
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for main content to load
    await page
      .waitForSelector("main, [role='main']", { timeout: 10000 })
      .catch(() => {
        // Continue even if main selector not found
      });

    // Additional wait to ensure page is fully rendered
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Run Lighthouse audit using CLI with cookies
    console.log("⏳ Running Lighthouse audit...\n");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const LIGHTHOUSE_DIR = path.join(
      process.cwd(),
      "__tests__",
      "integration",
      "lighthouse",
      "reports",
    );
    if (!fs.existsSync(LIGHTHOUSE_DIR)) {
      fs.mkdirSync(LIGHTHOUSE_DIR, { recursive: true });
    }
    // Lighthouse CLI adds .report.json and .report.html to the output path
    const baseReportPath = path.join(
      LIGHTHOUSE_DIR,
      `admin-dashboard-${timestamp}`,
    );
    const jsonReportPath = `${baseReportPath}.report.json`;
    const htmlReportPath = `${baseReportPath}.report.html`;

    // Create extra headers JSON for Lighthouse (format: { "Cookie": "..." })
    const extraHeaders = { Cookie: cookieString };
    const extraHeadersFile = path.join(
      LIGHTHOUSE_DIR,
      `headers-${timestamp}.json`,
    );
    fs.writeFileSync(extraHeadersFile, JSON.stringify(extraHeaders));

    try {
      // Run lighthouse CLI with extra headers file
      // Note: --extra-headers can take a file path or inline JSON
      // Note: --output-path should not include extension, Lighthouse adds .report.json/.report.html
      // Allow running in non-headless mode for visual debugging
      const headless = process.env.HEADLESS !== "false";
      const chromeFlags = headless ? "--headless --no-sandbox" : "--no-sandbox";
      const cmd = `npx --yes lighthouse "${url}" --output=json,html --output-path="${baseReportPath.replace(/\\/g, "/")}" --only-categories=performance,accessibility,best-practices,seo --chrome-flags="${chromeFlags}" --extra-headers="${extraHeadersFile.replace(/\\/g, "/")}"`;
      execSync(cmd, { stdio: "inherit", timeout: 120000 });
    } catch (error) {
      console.error("Lighthouse CLI error:", error);
      // Clean up headers file
      if (fs.existsSync(extraHeadersFile)) {
        fs.unlinkSync(extraHeadersFile);
      }
      throw error;
    }

    // Clean up headers file
    if (fs.existsSync(extraHeadersFile)) {
      fs.unlinkSync(extraHeadersFile);
    }

    // Read the JSON report
    const lhrJson = JSON.parse(fs.readFileSync(jsonReportPath, "utf-8"));
    const lhr = lhrJson;

    // Save HTML report path reference
    const reportPath = htmlReportPath;

    // Extract and display metrics
    const categories = lhr.categories;
    const metrics = lhr.audits;

    console.log("=".repeat(80));
    console.log("📊 LIGHTHOUSE METRICS FOR ADMIN DASHBOARD");
    console.log("=".repeat(80));
    console.log(`\n🔗 URL: ${url}\n`);

    // Display category scores
    console.log("📈 CATEGORY SCORES:");
    console.log("-".repeat(80));

    if (categories.performance) {
      const perfScore = Math.round((categories.performance.score || 0) * 100);
      console.log(
        `Performance:        ${perfScore}/100 ${getScoreEmoji(perfScore)}`,
      );
    }

    if (categories.accessibility) {
      const a11yScore = Math.round((categories.accessibility.score || 0) * 100);
      console.log(
        `Accessibility:      ${a11yScore}/100 ${getScoreEmoji(a11yScore)}`,
      );
    }

    if (categories["best-practices"]) {
      const bpScore = Math.round(
        (categories["best-practices"].score || 0) * 100,
      );
      console.log(
        `Best Practices:     ${bpScore}/100 ${getScoreEmoji(bpScore)}`,
      );
    }

    if (categories.seo) {
      const seoScore = Math.round((categories.seo.score || 0) * 100);
      console.log(
        `SEO:                ${seoScore}/100 ${getScoreEmoji(seoScore)}`,
      );
    }

    // Calculate overall score
    const scores = [
      categories.performance?.score,
      categories.accessibility?.score,
      categories["best-practices"]?.score,
      categories.seo?.score,
    ].filter((score): score is number => score !== undefined);

    const overallScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
        : 0;

    console.log("-".repeat(80));
    console.log(
      `Overall Score:      ${overallScore}/100 ${getScoreEmoji(overallScore)}`,
    );
    console.log("=".repeat(80));

    // Display key performance metrics
    console.log("\n⚡ PERFORMANCE METRICS:");
    console.log("-".repeat(80));

    const performanceMetrics = [
      "first-contentful-paint",
      "largest-contentful-paint",
      "total-blocking-time",
      "cumulative-layout-shift",
      "speed-index",
      "interactive",
      "time-to-first-byte",
    ];

    performanceMetrics.forEach((metricKey) => {
      const metric = metrics[metricKey];
      if (metric && metric.numericValue !== undefined) {
        const displayValue = formatMetricValue(metricKey, metric.numericValue);
        const displayUnit = getMetricUnit(metricKey);
        const score = metric.score ? Math.round(metric.score * 100) : null;
        console.log(
          `${metric.title.padEnd(30)} ${displayValue}${displayUnit} ${
            score !== null ? `${getScoreEmoji(score)}` : ""
          }`,
        );
      }
    });

    // Display accessibility metrics
    console.log("\n♿ ACCESSIBILITY ISSUES:");
    console.log("-".repeat(80));

    const a11yAudits = (Object.values(metrics) as LighthouseAudit[]).filter(
      (audit) =>
        audit.id.startsWith("accessibility") &&
        audit.score !== null &&
        audit.score < 1,
    );

    if (a11yAudits.length === 0) {
      console.log("✅ No accessibility issues found!");
    } else {
      a11yAudits.slice(0, 10).forEach((audit) => {
        const score = Math.round((audit.score || 0) * 100);
        console.log(
          `⚠️  ${audit.title.padEnd(40)} ${score}/100 ${getScoreEmoji(score)}`,
        );
      });
      if (a11yAudits.length > 10) {
        console.log(`   ... and ${a11yAudits.length - 10} more issues`);
      }
    }

    // Display opportunities for improvement
    console.log("\n💡 OPPORTUNITIES FOR IMPROVEMENT:");
    console.log("-".repeat(80));

    const opportunities = (Object.values(metrics) as LighthouseAudit[])
      .filter(
        (audit) =>
          audit.details &&
          audit.details.type === "opportunity" &&
          audit.numericValue &&
          audit.numericValue > 100, // Only show opportunities saving > 100ms
      )
      .sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0))
      .slice(0, 5);

    if (opportunities.length === 0) {
      console.log("✅ No major opportunities found!");
    } else {
      opportunities.forEach((opportunity) => {
        const savings = formatMetricValue(
          "opportunity",
          opportunity.numericValue || 0,
        );
        console.log(
          `💰 ${opportunity.title.padEnd(40)} Potential savings: ${savings}ms`,
        );
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log(`📄 Full Lighthouse report saved: ${reportPath}`);
    console.log(
      `\n💡 To view the report visually, open this file in your browser:`,
    );
    console.log(`   ${reportPath}`);
    console.log(`\n💡 Or run: npm run test:lighthouse:dashboard:view`);
    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(categories.performance).toBeDefined();
    expect(categories.accessibility).toBeDefined();
    expect(categories["best-practices"]).toBeDefined();
    expect(categories.seo).toBeDefined();
    expect(fs.existsSync(reportPath)).toBe(true);
  }, 120000);
});

// Helper functions
function getScoreEmoji(score: number): string {
  if (score >= 90) return "🟢";
  if (score >= 50) return "🟡";
  return "🔴";
}

function formatMetricValue(metricKey: string, value: number): string {
  if (metricKey.includes("time") || metricKey.includes("blocking")) {
    return value.toFixed(0);
  }
  if (
    metricKey.includes("paint") ||
    metricKey.includes("index") ||
    metricKey.includes("interactive")
  ) {
    return value.toFixed(0);
  }
  if (metricKey === "cumulative-layout-shift") {
    return value.toFixed(3);
  }
  if (metricKey === "opportunity") {
    return value.toFixed(0);
  }
  return value.toFixed(2);
}

function getMetricUnit(metricKey: string): string {
  if (
    metricKey.includes("time") ||
    metricKey.includes("blocking") ||
    metricKey.includes("opportunity")
  ) {
    return "ms";
  }
  if (
    metricKey.includes("paint") ||
    metricKey.includes("index") ||
    metricKey.includes("interactive")
  ) {
    return "ms";
  }
  if (metricKey === "cumulative-layout-shift") {
    return "";
  }
  return "";
}
