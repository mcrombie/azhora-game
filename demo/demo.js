import { createChronicleBook } from './book.js';
const el = (tag, text, className) => { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; };
try {
  const response = await fetch('./demo-pack.json'); if (!response.ok) throw Error('The archive could not be loaded.');
  const pack = await response.json();
  const pages = new Map(pack.entries.map(row => [row.id, row]));
  const archive = { list: async (_, settlementId) => pack.entries.filter(r => r.entry.settlementId === settlementId).map(r => ({ id: r.id, day: r.entry.day, kind: r.entry.kind })), get: async id => pages.get(id) };
  const book = createChronicleBook({ root: document.getElementById('book-root'), communities: () => pack.snapshot.settlements, worldId: () => pack.snapshot.worldId, archive, authoring: true });
  const hero = pack.entries.find(r => r.entry.events.some(e => e.type === 'player-help')) ?? pack.entries[0];
  document.getElementById('cover-image').src = hero.generation.imageUrl;
  document.getElementById('cover-caption').textContent = `${hero.entry.settlementName} · ${hero.entry.date} · an original AI woodcut`;
  document.getElementById('image-count').textContent = String(pack.entries.filter(r => r.generation.status === 'ready').length);
  const open = document.getElementById('open-volume'); open.disabled = false; open.textContent = 'Open the illustrated annals →'; open.onclick = () => book.open(hero.entry.settlementId);
  const descriptions = { fishing: 'Fishing households and the tally of a northern shore.', farming: 'Valley crops, shared stores, and obligations between neighbors.', forestry: 'Managed timber, household food plots, and care for the next season.' };
  for (const site of pack.snapshot.settlements) {
    const row = pack.entries.find(r => r.entry.settlementId === site.id && r.entry.events.some(e => e.type === 'custom')) ?? pack.entries.find(r => r.entry.settlementId === site.id);
    const card = el('article', undefined, 'community-card'), image = el('img'); image.src = row.generation.imageUrl; image.alt = `Woodcut of ${site.name}`; image.loading = 'lazy';
    const button = el('button', 'Read this community’s history →'); button.onclick = () => book.open(site.id);
    card.append(image, el('h3', site.name), el('p', descriptions[site.kind]), button); document.getElementById('community-cards').append(card);
  }
} catch (error) { const notice = document.getElementById('load-error'); notice.hidden = false; notice.textContent = error.message + ' Please reload in a moment.'; }
