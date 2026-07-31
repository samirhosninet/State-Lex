import { chromium } from '@playwright/test';
import { createServer, Server } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AddressInfo } from 'net';
import { ChromiumTestResult } from '../../main';

export async function runChromiumVerification(): Promise<void> {
  const distDir = join(process.cwd(), 'dist');

  if (!existsSync(join(distDir, 'index.html'))) {
    throw new Error("dist/index.html missing. Run 'npm run build' before executing Chromium test.");
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

  // Listen on dynamic free port (0) to eliminate EADDRINUSE collisions
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const port = address.port;

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`http://localhost:${port}`);

    await page.waitForFunction(() => typeof (window as unknown as Record<string, unknown>).runRoundTripIdentityTest === 'function');

    const result = await page.evaluate(async () => {
      const runner = (window as unknown as Record<string, () => Promise<ChromiumTestResult>>).runRoundTripIdentityTest;
      return await runner();
    });

    const browserVersion = browser.version();

    console.log(`Playwright Version: 1.62.1`);
    console.log(`Browser Used: Chromium`);
    console.log(`Chromium Version: ${browserVersion}\n`);

    console.log(`Original State Hash: ${result.originalHash}`);
    console.log(`Persisted Snapshot Hash: ${result.persistedHash}`);
    console.log(`Rehydrated State Hash: ${result.rehydratedHash}\n`);

    console.log(`Original == Persisted: ${result.originalEqualsPersisted ? 'PASS' : 'FAIL'}`);
    console.log(`Persisted == Rehydrated: ${result.persistedEqualsRehydrated ? 'PASS' : 'FAIL'}`);
    console.log(`Round-Trip Identity: ${result.roundTripIdentity ? 'PASS' : 'FAIL'}`);

    await browser.close();
  } finally {
    server.close();
  }
}
