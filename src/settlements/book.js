const element = (tag, text, className) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; };
const button = (text, action) => { const b = element('button', text); b.type = 'button'; b.onclick = action; return b; };
const names = { barley: 'Barley', 'cooked-fish': 'Prepared fish', 'pine-logs': 'Hearth fuel', 'oak-plank': 'Repair timber', herbs: 'Care stores', 'copper-piece': 'Common purse', water: 'Water', morale: 'Resolve', infrastructure: 'Shelter & waterworks' };

/** The same book reads an authoring pack or the persistent in-game archive. Text is never HTML. */
export function createChronicleBook({ root, communities, archive, worldId, onClose = () => {}, onTrack = () => {}, canView = () => true, authoring = false, refreshPage = async () => {} }) {
  let selected = null, pageIndex = -1, revision = 0, returnFocus, bodyOverflow = '';
  const shell = element('section', undefined, 'settlement-book'); shell.setAttribute('role', 'dialog'); shell.setAttribute('aria-modal', 'true'); shell.setAttribute('aria-label', 'The Feradom Annals'); shell.hidden = true; root.append(shell);
  async function render() {
    const ticket = ++revision, places = communities().filter(canView);
    selected = places.find(s => s.id === selected)?.id ?? places[0]?.id;
    const s = places.find(s => s.id === selected), rows = s ? await archive.list(worldId(), s.id) : [];
    if (ticket !== revision) return;
    pageIndex = pageIndex < 0 ? rows.length - 1 : Math.min(pageIndex, rows.length - 1);
    if (pageIndex >= 0) await refreshPage(rows[pageIndex].id);
    const row = pageIndex >= 0 ? await archive.get(rows[pageIndex].id) : null;
    if (ticket !== revision) return;
    shell.replaceChildren();
    const top = element('header', undefined, 'annals-heading');
    top.append(element('span', '✦  HEARTHFALL · AZHORA  ✦', 'annals-kicker'), element('h1', 'The Feradom Annals'), element('p', 'Being an account of the households, their labours, and the customs they keep.'));
    const close = button(authoring ? 'Close volume' : 'Return to the road', hide); close.className = 'annals-close'; top.append(close); shell.append(top);
    const nav = element('nav', undefined, 'annals-places'); nav.setAttribute('aria-label', 'Recorded communities');
    for (const place of places) { const b = button(place.name, () => { selected = place.id; pageIndex = -1; void render(); }); b.setAttribute('aria-pressed', String(place.id === selected)); nav.append(b); }
    shell.append(nav);
    if (!s) { shell.append(element('p', 'This volume will open when you discover a community in Feradom.', 'annals-empty')); return; }
    if (!row) { shell.append(element('p', 'The keeper is filing the first account. Open the volume again in a moment.', 'annals-empty')); return; }
    const { entry, generation } = row;
    const spread = element('div', undefined, 'annals-spread'), left = element('article', undefined, 'annals-leaf annals-account'), right = element('article', undefined, 'annals-leaf annals-register');
    left.append(element('p', `${entry.kind === 'opening' ? 'The opening of the ledger' : 'The daily account'} · ${entry.date}`, 'annals-running'), element('h2', s.name), element('div', '❦', 'annals-ornament'));
    const figure = element('figure', undefined, 'annals-woodcut');
    if (generation.status === 'ready' && generation.imageUrl) { const img = element('img'); img.src = generation.imageUrl; img.alt = `A woodcut of an event witnessed by ${entry.narrator.name} on ${entry.date}`; img.loading = 'lazy'; figure.append(img); }
    else { figure.append(element('span', '✥', 'annals-press-mark'), element('p', generation.status === 'budget' ? 'The press awaits its next allowance.' : generation.status === 'unknown' ? 'The printer’s receipt is being reconciled.' : 'A woodcut is awaiting the press.'), element('small', 'A fresh illustration belongs to each account.')); }
    left.append(figure, element('h3', entry.narrator.name), element('p', entry.narrator.occupation, 'annals-byline'));
    if (generation.prose) {
      for (const p of generation.prose.split(/\n\s*\n/)) left.append(element('p', p, 'annals-prose'));
    } else {
      left.append(element('p', 'The witness’s account is awaiting transcription. The recorded events are preserved below.', 'annals-pending'));
      const list = element('ul', undefined, 'annals-facts'); for (const e of entry.events) list.append(element('li', e.text)); left.append(list);
    }
    right.append(element('p', 'The common register', 'annals-running'), element('h2', 'Stores & households'));
    const detail = element('p', 'Select a measure to compare it with the opening of this day.', 'annals-detail');
    const stats = element('div', undefined, 'annals-stats');
    for (const [id, value] of Object.entries({ ...entry.after.stocks, water: entry.after.water, morale: entry.after.morale, infrastructure: entry.after.infrastructure })) {
      const before = entry.before.stocks[id] ?? entry.before[id], delta = value - before;
      const b = button('', () => { detail.textContent = `${names[id]}: ${before} at the opening; ${value} at the close. Change: ${delta > 0 ? '+' : ''}${delta}. These are this page’s figures.`; });
      b.append(element('span', names[id]), element('strong', String(value)), element('small', delta > 0 ? `+${delta}` : String(delta))); stats.append(b);
    }
    right.append(stats, detail, element('h3', 'A chart of the community'));
    const map = element('div', undefined, 'annals-local-map');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 360 180'); svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', 'Households around the common hearth');
    const svgNode = (tag, attrs, text) => { const n = document.createElementNS(svg.namespaceURI, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text) n.textContent = text; return n; };
    svg.append(svgNode('path', { d: 'M0 100Q90 70 175 92T360 80', fill: 'none', stroke: '#a58858', 'stroke-width': '9', opacity: '.35' }), svgNode('circle', { cx: 180, cy: 90, r: 12, fill: '#825433' }), svgNode('text', { x: 180, y: 119, 'text-anchor': 'middle' }, 'Common hearth'));
    const residentCard = element('div', undefined, 'annals-resident'); residentCard.append(element('p', 'Select a household to meet the people recorded on this page.'));
    async function recall(ids, title) {
      residentCard.replaceChildren(element('h4', title));
      const wanted = new Set(ids), found = [];
      for (const saved of [...rows].reverse()) {
        const past = await archive.get(saved.id);
        for (const event of past.entry.events) if (wanted.delete(event.id)) found.push(`${past.entry.date}: ${event.text}`);
        if (!wanted.size) break;
      }
      if (ticket !== revision) return;
      for (const text of found) residentCard.append(element('p', text));
      if (!found.length) residentCard.append(element('p', 'No earlier event has been recorded in this edition.'));
    }
    const houses = [...new Set(entry.residents.map(r => r.household))];
    for (let i = 0; i < houses.length; i++) {
      const x = i % 2 ? 274 : 60, y = i < 2 ? 22 : 130;
      const g = svgNode('g', { tabindex: '0', role: 'button', 'aria-label': `Read household ${i + 1}` });
      g.append(svgNode('rect', { x, y, width: 26, height: 21, fill: '#bb965c', stroke: '#61442c' }), svgNode('path', { d: `M${x - 3} ${y}l16 -12l16 12`, fill: 'none', stroke: '#61442c', 'stroke-width': 3 }));
      const selectHouse = () => {
        residentCard.replaceChildren();
        for (const r of entry.residents.filter(r => r.household === houses[i])) {
          const ties = Object.entries(r.relationships).map(([id, regard]) => `${entry.residents.find(person => person.id === id)?.name ?? id}: ${regard}/100 regard`).join('; ');
          residentCard.append(element('h4', r.name), element('p', `${r.occupation} · ${r.present ? 'at home' : 'away with kin'} · health ${r.health}`), element('p', `“${r.motive}.” Trust in the traveler: ${r.trustPlayer}. ${r.memories.length} remembered events.`), element('p', `Relationships on this day: ${ties}.`), button('Read remembered events', () => { void recall(r.memories, r.name + ' remembers'); }));
        }
      };
      g.onclick = selectHouse; g.onkeydown = e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); selectHouse(); } }; svg.append(g);
    }
    map.append(svg); right.append(map);
    if (!authoring) right.append(button('Mark this community on my chart', () => onTrack(s.id)));
    right.append(residentCard, element('h3', 'Customs remembered'));
    if (!entry.customs.length) right.append(element('p', 'The old ways of Feradom hold. No new local custom has yet been recorded.'));
    for (const c of entry.customs) { right.append(element('h4', c.name), element('p', c.rule), button(`Trace ${c.causes.length} founding occasions`, () => { void recall(c.causes, c.name + ' · origins'); })); }
    spread.append(left, right); shell.append(spread);
    const foot = element('nav', undefined, 'annals-pagination'); foot.setAttribute('aria-label', 'Account pages');
    const previous = button('← Earlier account', () => { pageIndex--; void render(); }); previous.disabled = pageIndex <= 0;
    const next = button('Later account →', () => { pageIndex++; void render(); }); next.disabled = pageIndex >= rows.length - 1;
    const choose = element('select'); choose.setAttribute('aria-label', 'Choose a dated account');
    for (const [i, row] of rows.entries()) { const option = element('option', `${i + 1}. ${new Date(Date.UTC(980, 3, 1) + row.day * 86400000).toISOString().slice(0, 10)}${row.kind === 'opening' ? ' · opening' : ''}`); option.value = String(i); choose.append(option); }
    choose.value = String(pageIndex); choose.onchange = () => { pageIndex = Number(choose.value); void render(); };
    foot.append(previous, element('span', `Folio ${pageIndex + 1} of ${rows.length} · ${entry.date}`), choose, next); shell.insertBefore(foot, spread);
  }
  function hide() { if (!shell.hidden) document.body.style.overflow = bodyOverflow; shell.hidden = true; revision++; onClose(); returnFocus?.focus?.(); }
  function open(id) { if (shell.hidden) { bodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } returnFocus = document.activeElement; selected = id ?? selected; pageIndex = -1; shell.hidden = false; void render().then(() => shell.querySelector('button')?.focus()); }
  shell.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); } if (e.key === 'Tab') { const buttons = [...shell.querySelectorAll('button:not(:disabled),select,[tabindex="0"]')]; const first = buttons[0], last = buttons.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } });
  return { open, close: hide, refresh: render, get isOpen() { return !shell.hidden; }, destroy() { if (!shell.hidden) document.body.style.overflow = bodyOverflow; revision++; shell.remove(); } };
}
