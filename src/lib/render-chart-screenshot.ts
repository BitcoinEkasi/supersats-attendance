import puppeteer from "puppeteer-core";
import type { TskGroupKey } from "@/lib/tsk-groups";

/** Screenshots the real "Attendance Analytics" chart for one group/month, via a
 *  headless browser navigating to the internal /chart-snapshot render target —
 *  the actual dashboard component, not a reimplementation. Returns null (never
 *  throws) on any failure — a missing/broken chart image must never stop the
 *  TSK Attendance email itself from sending. */
export async function renderGroupChartPng(group: TskGroupKey, month: string): Promise<Buffer | null> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const cronSecret = process.env.CRON_SECRET;
  if (!executablePath || !cronSecret) return null;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${cronSecret}` });
    await page.setViewport({ width: 960, height: 700 });

    const url = `http://127.0.0.1:3000/chart-snapshot?group=${group}&month=${encodeURIComponent(month)}`;
    const response = await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });
    if (!response || !response.ok()) return null;

    const chartEl = await page.waitForSelector("#pulse-chart-capture svg", { timeout: 10000 });
    if (!chartEl) return null;

    const wrapper = await page.$("#pulse-chart-capture");
    if (!wrapper) return null;

    const buf = await wrapper.screenshot({ type: "png" });
    return Buffer.from(buf);
  } catch (err) {
    console.error(`[render-chart-screenshot] failed for ${group} ${month}:`, err);
    return null;
  } finally {
    await browser?.close();
  }
}
