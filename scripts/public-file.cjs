// Shared by local HTTP hosts. Git ignores do not protect served files.
const fs = require('node:fs');
const path = require('node:path');
function isPublicFile(root, target) {
  const safe = filename => {
    const relative = path.relative(root, filename);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
      && !relative.split(/[\\/]/).some(part => /^(reference-private|\.git)$/i.test(part.replace(/[ .]+$/g,'')) || part.includes(':'));
  };
  if (!safe(target)) return false;
  try { return safe(fs.realpathSync(target)); } catch { return false; }
}
module.exports = { isPublicFile };
