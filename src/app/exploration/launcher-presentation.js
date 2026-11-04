// Presentation policy only. Mode IDs, save slots and game implementations stay shared.
// This is not an access-control boundary: explicit diagnostic routes still work.
export const launcherPresentation = search => new URLSearchParams(search).get('launcher') === 'developer' ? 'developer' : 'public';
export const automaticExploreLoading = presentation => presentation === 'public' ? 'fast' : null;

export function presentLauncher(document, presentation) {
  document.documentElement.dataset.launcher = presentation;
  const developer = presentation === 'developer';
  const story = document.querySelector('[data-launch-choice="war"]');
  // Keep keyboard and screen-reader order aligned with the public visual order.
  if (!developer) story.parentElement.prepend(story, document.querySelector('[data-launch-choice="explore"]'));
  story.querySelector('h2').textContent = developer ? 'Chapter 1: Lizeemi War' : 'Story';
  document.getElementById('new-world-war').textContent = developer ? 'Begin Lizeemi War' : 'Begin Story';
  document.getElementById('launcher-introduction').textContent = developer
    ? 'Explore the world, practice combat, or develop the campaigns.'
    : 'An adventure inside a living war. Choose a story to influence, or a world to explore.';
  document.getElementById('explore-description').textContent = developer
    ? 'Begin as Teresod in Minora with the atlas revealed and mounts for free travel. Choose Full or Fast loading before you enter.'
    : 'Explore Azhora freely, without an active campaign. Nearby landscapes prepare as you travel.';
}

export function presentContinue(button, available, presentation) {
  button.disabled = !available;
  button.hidden = presentation === 'public' && !available;
}
