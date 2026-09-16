import { readFile } from 'node:fs/promises';

// Match the desktop import map while preserving relative module dependencies.
const cache = new Map();
export async function moduleURL(url) {
  url = new URL(url, import.meta.url);
  if (cache.has(url.href)) return cache.get(url.href);
  const pending = (async () => {
    let source = await readFile(url, 'utf8');
    const matches = [...source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)];
    for (const match of matches) {
      const specifier = match[1];
      if (specifier === 'three') source = source.replace(match[0], match[0].replace(specifier, new URL('../vendor/three.module.js', import.meta.url).href));
      else if (specifier.startsWith('.')) {
        const dependency = await moduleURL(new URL(specifier, url));
        source = source.replace(match[0], match[0].replace(specifier, dependency));
      }
    }
    return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  })();
  cache.set(url.href, pending);
  return pending;
}
export async function sourceModule(file) { return import(await moduleURL(file)); }
