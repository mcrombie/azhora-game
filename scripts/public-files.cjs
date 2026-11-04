// Shared distribution contract. Nothing outside these roots enters the static build.
const PUBLISHED = Object.freeze(['index.html', 'exploration.html', 'adventure.html', 'lizeem.html', 'farmland.html', 'src', 'vendor', 'assets']);
const skip = entry => /\.test\.(?:c?js)$/.test(entry)
  || entry.split(/[\\/]/).some(part => /^(reference-private|\.git)$/i.test(part));
module.exports = {PUBLISHED, skip};
