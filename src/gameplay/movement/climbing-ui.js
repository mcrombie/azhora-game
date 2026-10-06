/** A small grip meter beside the traveler, plus a contextual first-grab hint. */
export function createClimbingUI(document) {
  const panel = document.createElement('aside'); panel.id = 'climbing-status'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Climbing');
  const ring = document.createElement('div'); ring.className = 'climbing-grip';
  ring.setAttribute('role', 'progressbar'); ring.setAttribute('aria-label', 'Climbing stamina'); ring.setAttribute('aria-valuemin', '0');
  const value = document.createElement('span'); ring.append(value);
  const text = document.createElement('div'), title = document.createElement('strong'), detail = document.createElement('small');
  text.append(title, detail); panel.append(ring, text); document.body.append(panel);
  const hint = document.createElement('aside'); hint.id = 'climbing-hint'; hint.hidden = true;
  hint.textContent = 'Space · Grip the rock and climb'; document.body.append(hint);
  return {
    update({ visible = false, state = {}, stamina = 0, maxStamina = 100, available = false, level = 1 } = {}) {
      const active = state.phase === 'climbing' || state.phase === 'falling';
      panel.hidden = !visible || !active; hint.hidden = !visible || active || !available;
      if (panel.hidden) return;
      const ratio = Math.max(0, Math.min(1, stamina / Math.max(1, maxStamina)));
      panel.dataset.warning = ratio < .25 ? 'true' : 'false';
      ring.style.setProperty('--grip', `${ratio * 100}%`);
      ring.setAttribute('aria-valuemax', String(Math.ceil(maxStamina))); ring.setAttribute('aria-valuenow', String(Math.ceil(stamina)));
      value.textContent = String(Math.ceil(stamina));
      title.textContent = state.phase === 'falling' ? 'Losing your grip' : `Climbing · Level ${level}`;
      detail.textContent = state.phase === 'falling' ? 'Sliding toward a foothold'
        : `${ratio < .25 ? 'Low stamina — find a ledge. ' : ''}W / S up & down · A / D across · Space boost · X let go`;
    },
    panel, hint,
  };
}
