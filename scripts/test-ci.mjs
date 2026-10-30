import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Reuse a locally installed Playwright Chrome when system Chrome is unavailable.
const cache = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright');
const browser = cache && existsSync(cache)
  ? readdirSync(cache).filter((entry) => /^chromium-\d+$/.test(entry)).sort().reverse()
    .map((entry) => join(cache, entry, 'chrome-win64', 'chrome.exe')).find(existsSync)
  : undefined;
const result = spawnSync(process.execPath, [
  'node_modules/@angular/cli/bin/ng.js', 'test', '--watch=false',
  '--karma-config=karma.conf.cjs', '--browsers=ChromeHeadlessWebGL',
  '--code-coverage', ...process.argv.slice(2),
], {
  stdio: 'inherit',
  env: { ...process.env, ...(browser && !process.env.CHROME_BIN ? { CHROME_BIN: browser } : {}) },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
