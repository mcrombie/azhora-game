import test from 'node:test';
import assert from 'node:assert/strict';
import {launcherPresentation, automaticExploreLoading, presentContinue} from '../src/app/exploration/launcher-presentation.js';
import {launchMode} from '../src/app/exploration/modes.js';

test('public visitors always get progressive Explore; developer loading remains a choice', () => {
  for (const search of ['', '?load=full', '?test=1', '?mode=explore&load=full']) {
    assert.equal(launcherPresentation(search), 'public');
    assert.equal(automaticExploreLoading(launcherPresentation(search)), 'fast');
  }
  assert.equal(automaticExploreLoading(launcherPresentation('?launcher=developer&load=full')), null);
});
test('presentation does not rewrite existing mode and diagnostic URLs', () => {
  for (const id of ['war','explore','combat','yunethre','oremindi','food-world','hearthfall']) {
    assert.equal(launchMode('?mode='+id).id, id);
    assert.equal(launchMode('?launcher=developer&mode='+id).id, id);
  }
});
test('public Continue is absent until compatible progress exists; developer state remains explicit', () => {
  const button = {};
  presentContinue(button, false, 'public'); assert.deepEqual(button, {disabled:true, hidden:true});
  presentContinue(button, true, 'public'); assert.deepEqual(button, {disabled:false, hidden:false});
  presentContinue(button, false, 'developer'); assert.deepEqual(button, {disabled:true, hidden:false});
});
