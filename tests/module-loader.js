import { registerHooks } from 'node:module';

// The game's modules import three by its bare name, as the desktop's import map
// allows. Under node the bare name is mapped to the vendored copy with a resolve
// hook, so every module loads from its own file, once, and relative imports stay
// relative. (This used to rewrite each module into a data URL with its
// dependencies' data URLs inside it, which copied a shared module once for every
// path to it: the world alone grew to minutes to load and gigabytes to hold.)
const THREE_URL = new URL('../vendor/three.module.js', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === 'three' ? THREE_URL : specifier, context);
  },
});

/** The URL a test-relative path resolves to. */
export async function moduleURL(url) { return new URL(url, import.meta.url).href; }
export async function sourceModule(file) { return import(await moduleURL(file)); }
