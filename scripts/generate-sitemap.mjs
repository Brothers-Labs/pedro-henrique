// @ts-check
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Gera `sitemap.xml` e completa o `robots.txt` a partir das páginas que o build
 * realmente pré-renderizou.
 *
 * A fonte da verdade é o HTML gerado: cada página traz a própria URL canônica
 * (montada pelo `SiteTitleStrategy` com o `siteUrl` do environment), então o
 * sitemap nunca lista uma rota que não existe nem esquece uma nova, e o
 * endereço do site é escrito num lugar só.
 *
 * Uso: `npm run build` (roda sozinho como `postbuild`).
 */

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER_OUTPUT = join(PROJECT_ROOT, 'dist', 'pedro-henrique', 'browser');
const PAGE_FILE_NAME = 'index.html';

const CANONICAL_LINK_PATTERN = /<link\b[^>]*\brel="canonical"[^>]*>/i;
const HREF_PATTERN = /\bhref="([^"]+)"/i;
const SITEMAP_LINE_PATTERN = /^Sitemap:.*$/gim;

function main() {
  if (!existsSync(BROWSER_OUTPUT)) {
    throw new Error(`Build não encontrado em ${BROWSER_OUTPUT}. Rode "ng build" antes.`);
  }

  const urls = findPageFiles(BROWSER_OUTPUT).map(readCanonicalUrl).sort();

  if (urls.length === 0) {
    throw new Error('Nenhuma página pré-renderizada encontrada para o sitemap.');
  }

  const origin = new URL(urls[0]).origin;
  const lastModified = new Date().toISOString().slice(0, 10);

  writeFileSync(join(BROWSER_OUTPUT, 'sitemap.xml'), buildSitemap(urls, lastModified));
  appendSitemapToRobots(`${origin}/sitemap.xml`);

  console.log(`Sitemap gerado com ${urls.length} páginas em ${origin}.`);
}

/** Toda `index.html` do build é uma página pré-renderizada; `index.csr.html` é o fallback do SPA. */
function findPageFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findPageFiles(path);
    }

    return entry.name === PAGE_FILE_NAME ? [path] : [];
  });
}

function readCanonicalUrl(pageFile) {
  const html = readFileSync(pageFile, 'utf8');
  const href = html.match(CANONICAL_LINK_PATTERN)?.[0].match(HREF_PATTERN)?.[1];

  if (!href) {
    throw new Error(`Página pré-renderizada sem URL canônica: ${pageFile}`);
  }

  return href;
}

function buildSitemap(urls, lastModified) {
  const entries = urls.map((url) =>
    [
      '  <url>',
      `    <loc>${escapeXml(url)}</loc>`,
      `    <lastmod>${lastModified}</lastmod>`,
      '  </url>',
    ].join('\n'),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

/** Idempotente: rodar o script de novo sobre o mesmo build não duplica a linha. */
function appendSitemapToRobots(sitemapUrl) {
  const robotsFile = join(BROWSER_OUTPUT, 'robots.txt');
  const current = existsSync(robotsFile)
    ? readFileSync(robotsFile, 'utf8')
    : 'User-agent: *\nAllow: /\n';
  const withoutSitemap = current.replace(SITEMAP_LINE_PATTERN, '').trimEnd();

  writeFileSync(robotsFile, `${withoutSitemap}\n\nSitemap: ${sitemapUrl}\n`);
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

main();
