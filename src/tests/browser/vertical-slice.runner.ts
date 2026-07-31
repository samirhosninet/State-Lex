import { chromium } from '@playwright/test';
import { createServer, Server } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AddressInfo } from 'net';

export async function runVerticalSliceE2E(): Promise<string> {
  const distDir = join(process.cwd(), 'dist');

  if (!existsSync(join(distDir, 'index.html'))) {
    throw new Error("dist/index.html missing. Run 'npm run build' before executing Vertical Slice test.");
  }

  const server: Server = createServer((req, res) => {
    let filePath = join(distDir, req.url === '/' ? 'index.html' : req.url || '');
    if (!existsSync(filePath)) {
      filePath = join(distDir, 'index.html');
    }

    try {
      const content = readFileSync(filePath);
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else {
        res.setHeader('Content-Type', 'text/html');
      }
      res.writeHead(200);
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const port = address.port;

  const logs: string[] = [];

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    logs.push("Step 1: Open Application");
    await page.goto(`http://localhost:${port}`);
    await page.waitForSelector('#btn-execute');

    logs.push("Step 2: New Game Initialized at Turn 1");

    logs.push("Step 3: Issue Command (DEVELOP EL_ALAMEIN) & Execute Turn");
    await page.selectOption('#sel-action', 'DEVELOP');
    await page.selectOption('#sel-region', 'EL_ALAMEIN');
    await page.click('#btn-execute');

    const turnAfterExecute = await page.textContent('#lbl-turn');
    logs.push(`State: Advanced to Turn ${turnAfterExecute?.trim()}`);

    logs.push("Step 4: Save Game State to IndexedDB");
    await page.click('#btn-save');
    await page.waitForTimeout(300);

    const savedStateBanner = await page.textContent('#status-banner');
    logs.push(`Banner: ${savedStateBanner?.trim()}`);

    logs.push("Step 5: Restart Application (New Page Load)");
    await page.goto(`http://localhost:${port}`);
    await page.waitForSelector('#btn-execute');

    logs.push("Step 6: Load Saved Game State");
    await page.click('#btn-load');
    await page.waitForTimeout(300);

    const loadedTurn = await page.textContent('#lbl-turn');
    const loadedBanner = await page.textContent('#status-banner');
    logs.push(`State: Loaded Turn ${loadedTurn?.trim()}`);
    logs.push(`Banner: ${loadedBanner?.trim()}`);

    logs.push("Step 7: Continue Playing (Execute Turn 2)");
    await page.selectOption('#sel-action', 'FORTIFY');
    await page.selectOption('#sel-region', 'EL_ALAMEIN');
    await page.click('#btn-execute');

    const finalTurn = await page.textContent('#lbl-turn');
    logs.push(`State: Continued Playing to Turn ${finalTurn?.trim()}`);

    await browser.close();
    return logs.join('\n');
  } finally {
    server.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith('vertical-slice.runner.ts')) {
  runVerticalSliceE2E().then(console.log);
}
