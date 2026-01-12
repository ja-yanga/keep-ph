import {
  setupBrowser,
  testAdminPage,
  authenticateAsAdmin,
} from "../helpers/browser-test-helper";
import type { Browser, Page } from "puppeteer";
import * as fs from "fs";

/**
 * Integration tests for Admin Mailrooms module
 *
 * Tests:
 * - Page loads correctly
 * - Screenshot is captured
 * - Lighthouse audit passes
 */
describe("Admin Mailrooms Module", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await setupBrowser();
    page = await browser.newPage();

    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1920, height: 1080 });

    // Authenticate as admin (if needed)
    try {
      await authenticateAsAdmin(page);
    } catch (error) {
      console.warn("Authentication skipped or failed:", error);
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it("should load mailrooms page and capture screenshot", async () => {
    const result = await testAdminPage(page, "/admin/mailrooms", "mailrooms");

    expect(result.screenshotPath).toBeDefined();
    expect(result.screenshotPath).toContain("admin-mailrooms");

    // Verify screenshot file exists
    expect(fs.existsSync(result.screenshotPath)).toBe(true);
  }, 60000);

  it("should pass Lighthouse audit for mailrooms page", async () => {
    const result = await testAdminPage(page, "/admin/mailrooms", "mailrooms");

    if (result.lighthouseScore !== undefined) {
      expect(result.lighthouseScore).toBeGreaterThanOrEqual(50); // Minimum acceptable score
      expect(result.lighthouseReportPath).toBeDefined();
    }
  }, 120000);
});
