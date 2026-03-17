const { test, expect } = require("@playwright/test");

test("runs a real audit from live stream to verified report", async ({ page }) => {
  const rawUrl = "example.com";
  const normalizedUrl = `https://${rawUrl}`;

  const reportResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/audits/") &&
      response.url().endsWith("/report") &&
      response.status() === 200,
    { timeout: 120_000 }
  );

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Get your website seen by AI Search Engines/i })
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: /Enter your website URL/i })
    .fill(rawUrl);
  await page.getByRole("button", { name: /^Start Audit$/ }).click();

  await expect(page.locator("body")).toContainText(normalizedUrl);
  await expect(page.locator("body")).toContainText("Reviewing your site now");

  const reportResponse = await reportResponsePromise;
  const report = await reportResponse.json();

  expect(report.reportType).toBe("LIGHTHOUSE_SIGNED_AUDIT");
  expect(report.status).toBe("VERIFIED");
  expect(report.targetUrl).toBe(normalizedUrl);
  expect(report.signature?.present).toBe(true);
  expect(report.signature?.algorithm).toBe("HMAC-SHA256");

  await expect(page.locator("body")).toContainText("Your results are ready");
  await expect(page.getByText("Top priority")).toBeVisible();
  await expect(page.getByText("Review status")).toBeVisible();
  await expect(page.getByText("Checked")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run another audit" })).toBeVisible();
  await expect(page.locator("body")).toContainText(/Visibility Score[\s\S]*\d+\/100/);
  await expect(page.locator("body")).not.toContainText(/Lighthouse|sidecar|Temporal|technical pass/i);
});
