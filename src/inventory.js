/** The small, physical things carried through the first journey out of Drent. */
export const INVENTORY_ITEMS = Object.freeze({
  'harbor-letter': Object.freeze({
    name: "Mara’s message", type: 'Quest item', icon: 'letter',
    brief: 'A report and letter of introduction to the Ambroni army post on the Avrel clearing.',
    description: 'The seal is already broken so you can read your errand. Keep the message with you for the road ahead.',
  }),
  'simple-sword': Object.freeze({
    name: 'Simple sword', type: 'Weapon', icon: 'sword',
    brief: 'Your plain iron sword. Reliable work for a mercenary, provided you care for the edge.',
    description: 'An unadorned iron blade with a cloth-wrapped grip. Attack with left-click or R. Each landed strike wears it by 1 condition; missed swings cost none. Inspect and equip weapons here with I. At 0 condition the sword cannot attack, but you keep it and can repair it.',
  }),
  'forest-stick': Object.freeze({
    name: 'Forest sticks', type: 'Weapon', icon: 'stick', stackable: true,
    brief: 'Fallen branches make short-lived weapons. Weaker and shorter than your sword.',
    description: 'Press F near a fallen stick to gather it. Each stick lasts 6 landed strikes and deals less damage with less reach than your sword. Misses cause no wear. A broken stick is used up; if you carry another, it becomes ready automatically. Switching weapons preserves a partly used stick.',
  }),
  'road-token': Object.freeze({
    name: 'Eren’s travel token', type: 'Quest item', icon: 'token',
    brief: 'A wooden token bearing the mark of the Greenway Watch.',
    description: 'Eren has vouched for your passage through the northern forest. Carry this token and Mara’s message to the forest’s edge. The road continues across the Avrel clearing, across the Caloss, and on into Luscia.',
  }),
  acorn: Object.freeze({
    name: 'Acorns', type: 'Gathered material', icon: 'acorn', stackable: true,
    brief: 'Little oak nuts gathered from the forest floor. Lysa collects them for her kitchen.',
    description: 'Freshly gathered acorns, still in their shells. These are raw ingredients, not ready-to-eat food: Lysa patiently prepares them and removes their bitter tannins before cooking. Her kitchen turns them into cakes, flatbread, and porridge.',
  }),
  pawpaw: Object.freeze({
    name: 'Ripe pawpaws', type: 'Food', icon: 'pawpaw', stackable: true, eatName: 'pawpaw',
    brief: 'Soft, sweet forest fruit with a banana-custard flavor. Restores up to 25 health.',
    description: 'Restores up to 25 health. Gather ripe fallen fruit beneath broad-leaved pawpaw saplings in the forest. The soft, sweet flesh has a banana-custard flavor. Open your satchel with I, select a pawpaw, then choose Eat. At full health, no fruit is consumed.',
  }),
  tinderbox: Object.freeze({
    name: 'Tinderbox', type: 'Tool', icon: 'tinderbox',
    brief: 'Lysa\'s gift: a small box of flint, steel, and dry tinder for the road.',
    description: 'A reusable flint and steel in a worn little tin. Bring it and two forest sticks to a firepit to light a cooking fire. Lighting the fire uses the sticks; you keep the tinderbox. Lysa gave it to you in thanks for five acorns.',
  }),
  'fishing-rod': Object.freeze({
    name: 'Fishing rod', type: 'Tool', icon: 'fishing-rod',
    brief: 'A simple wooden rod with a line and hook, given to you by the fishing teacher.',
    description: 'An inexpensive but serviceable rod. Take it to a marked fishing spot and follow the fishing prompts to catch a fish. The rod is reusable; caught fish go into your satchel as ingredients for a fire-cooked meal.',
  }),
  'raw-fish': Object.freeze({
    name: 'Raw fish', type: 'Ingredient', icon: 'raw-fish', stackable: true,
    brief: 'A fresh catch. Cook it at a lit firepit before eating.',
    description: 'Fresh fish caught with your rod. This is a cooking ingredient and cannot be eaten from the satchel. Use a lit firepit to turn one raw fish into one cooked fish. Bring your tinderbox and two forest sticks if the firepit needs lighting.',
  }),
  'cooked-fish': Object.freeze({
    name: 'Cooked fish', type: 'Food', icon: 'cooked-fish', stackable: true, eatName: 'cooked fish',
    brief: 'A simple meal cooked over a fire. Restores up to 40 health.',
    description: 'Restores up to 40 health. A fish cooked over the campfire, ready for the road. Open your satchel with I, select it, and choose Eat. Each meal uses one cooked fish. At full health, no food is consumed.',
  }),
});

/** No DOM dependency: ownership and selection can be checked independently. */
export function createInventoryState() {
  const owned = new Map();
  let selected = null;
  const validQuantity = quantity => Number.isSafeInteger(quantity) && quantity > 0;
  function add(id, quantity = 1) {
    if (!Object.hasOwn(INVENTORY_ITEMS, id) || !validQuantity(quantity)) return false;
    const previous = owned.get(id) ?? 0;
    if (!INVENTORY_ITEMS[id].stackable && (previous > 0 || quantity !== 1)) return false;
    const next = previous + quantity;
    if (!Number.isSafeInteger(next)) return false;
    owned.set(id, next);
    return true;
  }
  return {
    grant(id) {
      if (!Object.hasOwn(INVENTORY_ITEMS, id) || owned.has(id)) return false;
      return add(id);
    },
    add,
    count: id => owned.get(id) ?? 0,
    remove(id, quantity = 1) {
      if (!validQuantity(quantity) || !owned.has(id)) return false;
      const remaining = owned.get(id) - quantity;
      if (remaining < 0) return false;
      if (remaining === 0) {
        owned.delete(id);
        if (selected === id) selected = null;
      } else {
        owned.set(id, remaining);
      }
      return true;
    },
    has: id => owned.has(id),
    items: () => [...owned.keys()],
    selectedId: () => selected,
    select(id) {
      if (!owned.has(id)) return false;
      selected = id;
      return true;
    },
  };
}

const iconPaths = {
  letter: '<rect x="4" y="7" width="28" height="22" rx="2"/><path d="m5 9 13 10L31 9M5 27l9-9m17 9-9-9"/><circle cx="18" cy="19" r="3" fill="currentColor" stroke="none"/>',
  sword: '<path d="m13 23 14-19 5-1-1 6-16 16M15 21 28 7M9 20l9 8M12 25l-6 7-3-3 6-7M4 28l4 4"/>',
  stick: '<path d="m10 32 5-14 8-14 4 1-8 15-5 13ZM18 15l-6-5-2 2 6 7M21 12l8-3 1 2-10 5M12 28l3 1M15 21l3 1"/>',
  token: '<circle cx="18" cy="19" r="12"/><circle cx="18" cy="19" r="8.5"/><path d="m18 10-5 9h3v6h4v-6h3ZM14 7l-2-5m10 5 2-5"/>',
  acorn: '<path d="M8 17c0 10 6 15 10 16 4-1 10-6 10-16M7 16c0-6 5-10 11-10s11 4 11 10Z M18 6c-1-3 0-4 3-5M11 11l4 4m1-7 6 7m1-6 4 4M11 22c1 3 2 5 4 6"/>',
  pawpaw: '<path d="M14 12C8 11 3 20 5 27c2 8 9 9 14 3 4-5 5-12 1-15-2-2-4-1-6-3ZM10 18c-3 4-3 9 0 12M17 13l2-7M18 9C22 3 28 2 33 3c-2 7-7 12-15 10M20 11l10-6"/>',
  tinderbox: '<rect x="5" y="20" width="26" height="12" rx="2"/><path d="m5 20 4-5h7m8 0h4l3 5M6 24h24M16 24v3h4v-3M18 18c-6-3-1-6-1-10 3 2 1 4 4 4 1-3 1-5-1-8 7 5 7 12 1 14"/>',
  'fishing-rod': '<path d="m5 32 9-14C20 9 24 5 30 3M4 29l4 3M7 25l4 3M30 3v23c0 6-7 6-7 1v-3l2 2M17 16l2 2M23 9l2 2"/><circle cx="12" cy="24" r="3"/>',
  'raw-fish': '<path d="M9 18C16 7 26 9 32 18c-6 9-16 11-23 0ZM9 18 3 11v14ZM22 12c-3 3-3 9 0 12M14 12l3-6 5 5M14 24l3 6 5-5"/><circle cx="27" cy="17" r="1"/>',
  'cooked-fish': '<path d="M9 23c7-9 17-8 23 0-6 8-16 9-23 0ZM9 23l-6-6v12ZM24 18c-3 3-3 7 0 10M13 20l3 6m3-8 3 8M12 13c-4-4 4-5 0-9m8 9c-4-4 4-5 0-9m8 9c-4-4 4-5 0-9"/><circle cx="28" cy="22" r="1"/>',
};

function icon(kind) {
  const wrapper = document.createElement('span');
  wrapper.className = 'inventory-item-icon';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${iconPaths[kind]}</svg>`;
  return wrapper;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createInventory({
  onInspect = () => {}, onClose = () => {},
  getWeaponStatus = () => null, onEquip = () => false,
  getConsumableStatus = () => null, onConsume = () => ({ok: false}),
} = {}) {
  const state = createInventoryState();
  let opened = false;
  let returnFocus = null;
  let hoveredItem = null;
  const itemButtons = new Map();

  const backdrop = element('div', 'inventory-overlay');
  backdrop.id = 'inventory-backdrop';
  backdrop.hidden = true;
  const panel = element('section', 'inventory-drawer');
  panel.id = 'inventory-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'inventory-title');
  panel.setAttribute('aria-describedby', 'inventory-hint');
  panel.tabIndex = -1;
  backdrop.append(panel);

  const header = element('header', 'inventory-header');
  header.append(element('p', 'inventory-eyebrow', 'What you carry'));
  const title = element('h2', '', 'Satchel');
  title.id = 'inventory-title';
  header.append(title);
  const subtitle = element('p', 'inventory-subtitle', 'I opens and closes your satchel.');
  header.append(subtitle);
  const closeButton = element('button', 'inventory-close', '×');
  closeButton.type = 'button';
  closeButton.id = 'inventory-close';
  closeButton.setAttribute('aria-label', 'Close satchel');
  closeButton.title = 'Close satchel · I or Esc';
  header.append(closeButton);
  panel.append(header);

  const scroller = element('div', 'inventory-scroll');
  const hint = element('p', 'inventory-hint');
  hint.id = 'inventory-hint';
  const list = element('div', 'inventory-items');
  list.id = 'inventory-items';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Carried items');
  const detail = element('section', 'inventory-detail');
  detail.id = 'inventory-detail';
  detail.setAttribute('aria-label', 'Selected item');
  detail.setAttribute('aria-live', 'polite');
  scroller.append(hint, list, detail);
  panel.append(scroller);

  const footer = element('footer', 'inventory-footer');
  const closeFooter = element('button', 'inventory-dismiss', 'Close satchel · I / Esc');
  closeFooter.type = 'button';
  footer.append(closeFooter, element('p', '', 'The world waits while you look.'));
  panel.append(footer);

  const tooltip = element('div', 'inventory-tooltip');
  tooltip.id = 'inventory-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  backdrop.append(tooltip);
  document.body.append(backdrop);

  function hideTooltip() {
    tooltip.hidden = true;
    for (const button of itemButtons.values()) button.removeAttribute('aria-describedby');
  }

  function showTooltip(id, button) {
    if (!opened) return;
    const item = INVENTORY_ITEMS[id];
    tooltip.replaceChildren(
      element('strong', '', item.name),
      element('span', 'inventory-tooltip-type', item.type),
      element('p', '', item.brief),
      element('span', 'inventory-tooltip-action', 'Click or Enter to select'),
    );
    const weapon = getWeaponStatus(id);
    if (weapon) {
      const condition = `${weapon.durability} of ${weapon.maxDurability} condition`;
      tooltip.querySelector('.inventory-tooltip-type').textContent = `${item.type} \u00b7 ${condition}${weapon.equipped ? ' \u00b7 Equipped' : ''}${!weapon.usable ? ' \u00b7 Broken' : ''}`;
    }
    for (const other of itemButtons.values()) other.removeAttribute('aria-describedby');
    button.setAttribute('aria-describedby', tooltip.id);
    tooltip.hidden = false;
    const bounds = button.getBoundingClientRect();
    const width = Math.min(258, window.innerWidth - 24);
    tooltip.style.width = `${width}px`;
    const left = bounds.left - width - 14;
    tooltip.style.left = `${Math.max(12, left >= 12 ? left : Math.min(bounds.left, window.innerWidth - width - 12))}px`;
    const preferredTop = left >= 12 ? bounds.top : bounds.bottom + 8;
    tooltip.style.top = `${Math.max(12, Math.min(preferredTop, window.innerHeight - tooltip.offsetHeight - 12))}px`;
  }

  function renderDetail() {
    const id = state.selectedId();
    for (const [itemId, button] of itemButtons) {
      button.classList.toggle('selected', itemId === id);
      button.setAttribute('aria-pressed', String(itemId === id));
    }
    detail.replaceChildren();
    if (!id) {
      detail.append(
        element('p', 'inventory-detail-kicker', 'Take a closer look'),
        element('h3', '', state.items().length ? 'Select an item above' : 'Room for a journey'),
        element('p', '', state.items().length
          ? 'Hover over an item for a quick description. Click it, or use Tab then Enter, to see what you are carrying.'
          : 'Items given to you on the road will appear here. Speak with Mara at the landing to receive your first errand.'),
      );
      return;
    }
    const item = INVENTORY_ITEMS[id];
    detail.append(element('p', 'inventory-detail-kicker', item.type), element('h3', '', item.name));
    if (item.stackable) detail.append(element('p', 'inventory-detail-count', `${state.count(id)} carried`));
    if (id === 'harbor-letter') {
      detail.append(element('p', 'inventory-description', item.description));
      const letter = element('article', 'inventory-letter');
      letter.id = 'inventory-letter-body';
      letter.setAttribute('aria-label', 'Mara’s message to Quartermaster Corvan');
      letter.tabIndex = 0;
      letter.append(
        element('p', 'inventory-letter-address', 'To Quartermaster Corvan, Ambroni Legion, The Avrel Clearing'),
        element('p', '', 'Bramble goblin raiders have cut the road out of Tidehaven. Our watch is holding the northern path, but the village needs help keeping travelers safe.'),
        element('p', '', 'The bearer has answered the Ambroni Empire’s call for mercenaries. Receive them at your field post, record their service, and give them their first orders. They arrive with a plain sword and no armor.'),
        element('p', '', 'The Legion promises protection from the goblin raids spilling out of Pueth and says it needs hands against the rebels in the south. First report at the Avrel clearing, just beyond Tidehaven’s forest. Keep this letter as your introduction and proof of service; Corvan will arrange the copies needed farther up the road.'),
        element('p', 'inventory-letter-signature', 'Mara\nHarbormaster of Tidehaven'),
      );
      detail.append(letter);
    } else {
      detail.append(element('p', 'inventory-description', item.description));
    }
    const weapon = getWeaponStatus(id);
    if (item.type === 'Weapon' && weapon) {
      const condition = element('meter', 'inventory-condition');
      condition.min = 0;
      condition.max = weapon.maxDurability;
      condition.value = weapon.durability;
      condition.low = weapon.maxDurability === 6 ? 2 : weapon.maxDurability / 4;
      condition.high = weapon.maxDurability;
      condition.optimum = weapon.maxDurability;
      condition.setAttribute('aria-label', `${item.name} condition`);
      condition.setAttribute('aria-valuetext', `${weapon.durability} of ${weapon.maxDurability}${weapon.usable ? '' : ', broken'}`);
      const conditionText = element('p', 'inventory-condition-text', `${weapon.durability} of ${weapon.maxDurability} condition${weapon.usable ? '' : ' \u00b7 Broken'}`);
      detail.append(conditionText, condition);
      if (!weapon.usable) detail.append(element('p', 'inventory-equipment-note', id === 'simple-sword'
        ? 'Broken: your sword cannot attack. Keep it and repair it for free at the village workbench beside the straw practice post. Press F at the bench.'
        : 'This stick is spent. Gather another in the forest with F, or equip your sword.'));
      else detail.append(element('p', 'inventory-equipment-note', id === 'simple-sword'
        ? 'Repair before it breaks: press F at the free village workbench beside the straw practice post.'
        : `${state.count(id)} carried, including the stick in use. The village workbench can mend a partly worn stick; a broken one is consumed.`));
      const equipButton = element('button', 'inventory-dismiss inventory-equip', weapon.equipped ? 'Equipped' : `Equip ${id === 'forest-stick' ? 'stick' : 'sword'}`);
      equipButton.type = 'button';
      equipButton.dataset.equip = id;
      equipButton.disabled = weapon.equipped || !weapon.usable || weapon.equipBlocked;
      equipButton.setAttribute('aria-label', weapon.equipped ? `${item.name} is equipped` : `Equip ${item.name}`);
      equipButton.addEventListener('click', () => {
        const current = getWeaponStatus(id);
        if (!current?.usable || current.equipped || current.equipBlocked) return;
        onEquip(id);
        hideTooltip();
        renderItems();
        detail.tabIndex = -1;
        detail.focus({preventScroll: true});
      });
      detail.append(equipButton);
      if (weapon.equipBlocked) detail.append(element('p', 'inventory-equipment-note', 'Close the satchel and finish your current swing or dodge before switching weapons.'));
    }
    const consumable = getConsumableStatus(id);
    if (consumable) {
      const healthText = element('p', 'inventory-condition-text', `${consumable.health} of ${consumable.maxHealth} health`);
      const health = element('meter', 'inventory-condition inventory-health');
      health.min = 0;
      health.max = consumable.maxHealth;
      health.value = consumable.health;
      health.low = consumable.maxHealth / 4;
      health.high = consumable.maxHealth;
      health.optimum = consumable.maxHealth;
      health.setAttribute('aria-label', 'Your health');
      health.setAttribute('aria-valuetext', `${consumable.health} of ${consumable.maxHealth} health`);
      const foodName = item.eatName || item.name.toLowerCase();
      const consumeButton = element('button', 'inventory-dismiss inventory-consume', `Eat ${foodName} \u00b7 +${consumable.healing} health`);
      consumeButton.type = 'button';
      consumeButton.dataset.consume = id;
      consumeButton.disabled = !consumable.canUse;
      consumeButton.setAttribute('aria-label', `Eat one ${foodName} to restore up to ${consumable.healing} health`);
      const note = element('p', 'inventory-consumable-note', consumable.canUse
        ? `Eat one ${foodName}. Any remaining food stays in your satchel.`
        : consumable.reason);
      note.id = 'inventory-consumable-note';
      consumeButton.setAttribute('aria-describedby', note.id);
      consumeButton.addEventListener('click', () => {
        const current = getConsumableStatus(id);
        // Recheck after the click: health or action state may have changed since rendering.
        const result = current?.canUse ? onConsume(id) : {ok: false, reason: current?.reason};
        hideTooltip();
        renderItems();
        if (result?.ok) {
          const feedback = element('p', 'inventory-consumable-note', `Restored ${result.healed} health.`);
          feedback.setAttribute('role', 'status');
          detail.append(feedback);
        } else if (result?.reason && !state.has(id)) {
          detail.append(element('p', 'inventory-consumable-note', result.reason));
        }
        if (opened) {
          // Removing the last serving also removes the button. Keep keyboard focus
          // inside the drawer, without silently selecting an unrelated item.
          const nextButton = detail.querySelector('[data-consume]');
          if (nextButton && !nextButton.disabled) nextButton.focus({preventScroll: true});
          else { detail.tabIndex = -1; detail.focus({preventScroll: true}); }
        }
      });
      detail.append(healthText, health, consumeButton, note);
    }
  }

  function select(id) {
    if (!state.select(id)) return false;
    hideTooltip();
    renderDetail();
    // Selecting a message should reveal its contents even in a short window;
    // the drawer header and dismiss control remain fixed while this area scrolls.
    if(opened)detail.scrollIntoView({block:'start',behavior:'smooth'});
    onInspect(id);
    return true;
  }

  function renderItems() {
    const focusedId = document.activeElement?.dataset?.itemId;
    const focusedConsumable = document.activeElement?.dataset?.consume;
    list.replaceChildren();
    itemButtons.clear();
    for (const id of state.items()) {
      const item = INVENTORY_ITEMS[id];
      const weapon = getWeaponStatus(id);
      const button = element('button', 'inventory-item');
      button.type = 'button';
      button.dataset.itemId = id;
      button.setAttribute('aria-label', `${item.name}${item.stackable ? `, ${state.count(id)} carried` : ''}, ${item.type}${weapon ? `, ${weapon.durability} of ${weapon.maxDurability} condition${weapon.equipped ? ', equipped' : ''}${!weapon.usable ? ', broken' : ''}` : ''}. Select to inspect.`);
      button.setAttribute('aria-pressed', String(id === state.selectedId()));
      const label = element('span', 'inventory-item-label');
      label.append(element('strong', '', item.name), element('small', '', weapon
        ? `${item.type} \u00b7 ${weapon.durability}/${weapon.maxDurability}${weapon.usable ? '' : ' \u00b7 Broken'}`
        : item.type));
      button.append(icon(item.icon), label);
      if (item.stackable) button.append(element('span', 'inventory-stack-count', `\u00d7${state.count(id)}`));
      button.append(element('span', 'inventory-select-label', weapon?.equipped ? 'Equipped' : 'Select'));
      button.addEventListener('click', () => select(id));
      button.addEventListener('pointerenter', () => { hoveredItem = id; showTooltip(id, button); });
      button.addEventListener('pointerleave', () => {
        hoveredItem = null;
        if (document.activeElement !== button) hideTooltip();
      });
      button.addEventListener('focus', () => showTooltip(id, button));
      button.addEventListener('blur', () => { if (hoveredItem !== id) hideTooltip(); });
      itemButtons.set(id, button);
      list.append(button);
    }
    if (!state.items().length) list.append(element('p', 'inventory-empty', 'Your satchel is empty for now.'));
    renderDetail();
    if (focusedId && opened) itemButtons.get(focusedId)?.focus({preventScroll: true});
    if (focusedConsumable && opened) {
      const nextButton = detail.querySelector('[data-consume]');
      if (nextButton?.dataset.consume === focusedConsumable && !nextButton.disabled) nextButton.focus({preventScroll: true});
      else { detail.tabIndex = -1; detail.focus({preventScroll: true}); }
    }
  }

  function close() {
    if (!opened) return false;
    opened = false;
    hoveredItem = null;
    hideTooltip();
    backdrop.hidden = true;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    returnFocus = null;
    onClose();
    return true;
  }

  closeButton.addEventListener('click', close);
  closeFooter.addEventListener('click', close);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
  scroller.addEventListener('scroll', hideTooltip, {passive: true});
  window.addEventListener('resize', hideTooltip);
  panel.addEventListener('keydown', event => {
    if (!opened || event.code !== 'Tab') return;
    const focusable = [...panel.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
    event.stopPropagation();
  });

  renderItems();
  return {
    grant(id) {
      const added = state.grant(id);
      if (added) { hideTooltip(); renderItems(); }
      return added;
    },
    add(id, quantity = 1) {
      const added = state.add(id, quantity);
      if (added) { hideTooltip(); renderItems(); }
      return added;
    },
    count: state.count,
    remove(id, quantity = 1) {
      const removed = state.remove(id, quantity);
      if (removed) { hideTooltip(); renderItems(); }
      return removed;
    },
    has: state.has,
    items: state.items,
    selectedId: state.selectedId,
    select,
    refresh() { hideTooltip(); renderItems(); },
    isOpen: () => opened,
    open({lesson = false} = {}) {
      hint.textContent = lesson
        ? 'Your next lesson: select Mara’s message and read your errand. Then close the satchel with I, Esc, or ×.'
        : 'Hover for a tooltip. Click an item, or use Tab then Enter, to inspect it.';
      if (opened) return;
      opened = true;
      returnFocus = document.activeElement;
      backdrop.hidden = false;
      panel.classList.toggle('inventory-lesson', lesson);
      renderItems();
      closeButton.focus({preventScroll: true});
    },
    close,
  };
}
