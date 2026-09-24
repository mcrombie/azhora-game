import { SKILLS } from './skills.js';
import { skillIconSVG } from './skill-icons.js';

const LESSONS = {
  fire:{text:'Ben has taught you Fireball. Aim carefully: fire can hurt friends as well as enemies.',controls:'Z to cast - N to change spells - I to equip a wand'},
  beast:{text:'Liz has taught you to summon a swarm of bees to harry your enemies.',controls:'Z to cast - N to change spells - Keep your wand equipped'},
  mind:{text:'Troy has taught you Mind Read. Stand close to someone to hear an unspoken thought.',controls:'Z to read a nearby mind - N to change spells'},
  blades: { title: 'Combat · Blades', text: 'Strike with your sword, watch your opponent, and give yourself room to recover.', controls: 'Left click / R to swing · Hold V to guard · C to dodge' },
  shield: { text: 'Face an incoming attack and hold your shield up to catch the blow.', controls: 'Hold V to guard · Keep an eye on stamina' },
  toughness: { text: 'You are learning to survive a fight. Practice your timing and step clear of incoming blows.', controls: 'C to dodge · Leave room to recover stamina' },
  cartography: { text: 'Your chart records the ground you explore. Nearby hexes show rough terrain; visiting reveals their detail.', controls: 'M to open your map · Scroll to zoom · Drag to explore' },
  stealth: { text: 'Move quietly and use cover to pass guards. Practice near danger to gain experience.', controls: 'X to sneak · Stay out of the guards’ sight' },
  construction: { text: 'Build and repair with wood. Useful work, including repairing Chip’s bridge, earns Carpentry experience.', controls: 'F at a work site · I to check your supplies' },
};

export function skillIntroduction(id) {
  const skill = SKILLS[id];
  if (!skill) return null;
  const lesson = LESSONS[id] ?? {};
  return { id, title: lesson.title ?? skill.name, text: lesson.text ?? skill.blurb, controls: lesson.controls ?? 'J → Skills for your guide and ways to practice' };
}

/** Lessons wait for gameplay, keep their full reading time, and never overwrite one another. */
export function createSkillAnnouncementQueue({ duration = 8 } = {}) {
  const pending = [], seen = new Set();
  let current = null, remaining = 0;
  return {
    enqueue(id) {
      if (!skillIntroduction(id) || seen.has(id)) return false;
      seen.add(id); pending.push(id); return true;
    },
    tick(dt, visible = true) {
      if (!visible) return null;
      if (current) {
        remaining -= Math.max(0, Number(dt) || 0);
        if (remaining <= 0) current = null;
      }
      if (!current && pending.length) { current = pending.shift(); remaining = duration; }
      return current ? skillIntroduction(current) : null;
    },
    dismiss() { current = null; remaining = 0; },
    clear() { current = null; remaining = 0; pending.length = 0; seen.clear(); },
    get pending() { return pending.length; },
  };
}

export function createSkillAnnouncement({ mount, onOpen = () => {}, onShow = () => {} }) {
  const queue = createSkillAnnouncementQueue();
  mount.innerHTML = '<div class="skill-intro-icon" aria-hidden="true"></div><span class="eyebrow">NEW SKILL LEARNED</span><h2></h2><p class="skill-intro-description"></p><p class="skill-intro-controls"></p><div class="skill-intro-actions"><button type="button" class="skill-intro-guide">View skill <kbd>Enter</kbd></button><button type="button" class="skill-intro-dismiss">Continue</button></div>';
  let showing = null, lastShown = null;
  function hide() { showing = null; mount.hidden = true; document.body.classList.remove('skill-intro-active'); }
  function dismiss() { queue.dismiss(); hide(); }
  function open() { if (!showing) return false; const id = showing; dismiss(); onOpen(id); return true; }
  mount.querySelector('.skill-intro-guide').onclick = open;
  mount.querySelector('.skill-intro-dismiss').onclick = dismiss;
  hide();
  return {
    enqueue: id => queue.enqueue(id),
    clear() { queue.clear(); lastShown = null; hide(); },
    open,
    frame(dt, eligible) {
      const lesson = queue.tick(dt, eligible);
      if (!lesson) { hide(); return; }
      if (showing !== lesson.id) {
        mount.querySelector('.skill-intro-icon').innerHTML = skillIconSVG(lesson.id);
        mount.querySelector('h2').textContent = lesson.title;
        mount.querySelector('.skill-intro-description').textContent = lesson.text;
        mount.querySelector('.skill-intro-controls').textContent = lesson.controls;
        if (lastShown !== lesson.id) { onShow(lesson.id); lastShown = lesson.id; }
      }
      showing = lesson.id; mount.hidden = false; document.body.classList.add('skill-intro-active');
    },
    get visible() { return showing !== null; },
  };
}
