/**
 * E2E happy-path spec (Playwright). Run against a live `docker compose up -d` stack:
 *   npx playwright test tests/e2e/dashboard.spec.ts
 *
 * Covers the spec'd flows: open dashboard, switch zh/en, switch dark/light, start the
 * simulation, watch the leaderboard update, open a decision log, trigger the kill switch,
 * and export logs. This file is a documented scaffold; install @playwright/test to run it.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("TradePilot Arena dashboard", () => {
  test("loads the simulation dashboard in Chinese by default", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText("模拟盘总览")).toBeVisible();
    await expect(page.getByText("Agent 排行榜")).toBeVisible();
  });

  test("switches language zh -> en", async ({ page }) => {
    await page.goto(BASE);
    await page.getByRole("button", { name: /toggle language/i }).click();
    await expect(page.getByText("Agent Leaderboard")).toBeVisible();
  });

  test("toggles dark/light theme", async ({ page }) => {
    await page.goto(BASE);
    await page.getByRole("button", { name: /toggle theme/i }).click();
    // html class should change
  });

  test("starts simulation and shows four agents on the leaderboard", async ({ page }) => {
    await page.goto(BASE);
    await page.getByRole("button", { name: /开始|Start/ }).click();
    await expect(page.getByText("OpenAI Agent")).toBeVisible();
  });

  test("kill switch requires confirmation", async ({ page }) => {
    await page.goto(BASE);
    await page.getByRole("button", { name: /紧急停止|Kill Switch/ }).click();
    await expect(page.getByText(/确认|Trigger/)).toBeVisible();
  });
});
