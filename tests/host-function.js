import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

/** Execute a small actual host boundary with explicit dependencies, without booting Three or DOM.
 * Compile successive lines until the named declaration is complete. This avoids asserting the
 * spelling of its body and does not duplicate the implementation under test.
 */
export function hostFunction(name, dependencies = {}) {
  const declarationStart = main.indexOf(`function ${name}(`);
  const start = declarationStart >= 0 ? declarationStart : main.indexOf(`const ${name}=`);
  if (start < 0) throw new Error(`Missing host function: ${name}`);
  let declaration = '';
  for (const line of main.slice(start).split('\n')) {
    declaration += `${line}\n`;
    let factory;
    try { factory = new Function(...Object.keys(dependencies), `${declaration}; return ${name};`); }
    catch (error) { if (error instanceof SyntaxError) continue; throw error; }
    return factory(...Object.values(dependencies));
  }
  throw new Error(`Incomplete host function: ${name}`);
}

/** The live frame owns the pause policy; run that statement against the real saved model. */
export function advanceHostClock({ living, mode, reviewFrozen = false, dt = 1 }) {
  const statement = main.split('\n').find(line => line.includes('living.tick(dt)'));
  if (!statement) throw new Error('Missing live frame clock update');
  return new Function('living', 'mode', 'reviewFrozen', 'dt',
    `let playSeconds=living.clock(); ${statement}; return playSeconds;`)(living, mode, reviewFrozen, dt);
}
