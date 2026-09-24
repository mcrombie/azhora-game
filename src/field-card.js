import { SKILLS, skillLevel } from './skills.js';

/** Discoveries and field notices share a card, but only skill discoveries have XP.
 * A fallen companion notice deliberately has no skill or progress bar.
 */
export function renderFieldCard(mount, { kicker = '', name = '', note = '', skill } = {}, skills) {
  const field = id => mount.querySelector(`#bird-card-${id}`);
  const view = skills?.view().find(entry => entry.id === skill);
  const level = skillLevel(skill, view?.xp ?? 0);
  field('kicker').textContent = kicker;
  field('name').textContent = name;
  field('note').textContent = note;
  const fill = field('fill'), label = field('level');
  // Reset both directions: a discovery after a death notice must restore its meter.
  fill.parentElement.style.display = level ? '' : 'none';
  label.style.display = level ? '' : 'none';
  fill.style.width = level ? `${Math.round(level.progress * 100)}%` : '0%';
  const skillName = view?.name ?? SKILLS[skill]?.name;
  label.textContent = !level ? '' : level.max
    ? `${skillName} ${level.level} · ${level.xp} experience`
    : `${skillName} ${level.level} · ${level.xp} / ${level.next} experience`;
  mount.classList.add('visible');
  return { hasProgress: !!level };
}
