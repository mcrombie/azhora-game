import test from 'node:test';
import assert from 'node:assert/strict';
import { CHART_LESSON_STAGES, createChartLesson, validateChartLesson } from '../src/chart-lesson.js';
import { lessonStage, instructorConversation } from '../src/instructor.js';

test('combat completion issues the chart, opening it enables the return, and reporting alone finishes', () => {
  const lesson = createChartLesson();
  assert.equal(lesson.noteMapOpened(), false, 'opening the map before instruction does not bank the lesson');
  assert.equal(lesson.report(), false);
  assert.equal(lesson.issue(), true);
  assert.equal(lesson.stage, 'open-map');
  assert.equal(lesson.issue(), false);
  assert.equal(lesson.report(), false, 'receiving the chart is not enough');
  assert.equal(lessonStage({ taught: true, chartLesson: lesson.stage }), 'open-map', 'skill ownership cannot skip the lesson');
  const card = lesson.view().card;
  assert.match(card.controls, /M or Esc/);
  assert.equal(lesson.noteMapOpened(), true);
  assert.equal(lesson.stage, 'return-to-glun');
  assert.equal(lessonStage({ taught: true, chartLesson: lesson.stage }), 'return-to-glun');
  assert.deepEqual(lesson.view().card, card, 'the explanation stays visible on the map until the report');
  assert.equal(lesson.noteMapOpened(), false);
  assert.equal(lesson.report(), true);
  assert.deepEqual(lesson.view(), { stage: 'complete', active: false, done: true, card: null });
  assert.equal(lesson.report(), false);
});

test('chart lesson progress survives a reload at every step and refuses invalid data', () => {
  for (const stage of CHART_LESSON_STAGES) {
    const saved = createChartLesson(stage).snapshot(), loaded = createChartLesson();
    assert.equal(loaded.restore(saved), true);
    assert.equal(loaded.stage, stage);
  }
  const lesson = createChartLesson('return-to-glun');
  for (const bad of [null, undefined, {}, 2, 'opened', '__proto__']) {
    assert.equal(validateChartLesson(bad), false);
    assert.equal(lesson.restore(bad), false);
    assert.equal(lesson.stage, 'return-to-glun');
  }
});

test('Glun exposes chart issue, map opening and final report as separate conversation actions', () => {
  const calls = [];
  const context = {
    openDialogue: (npc, lines, event, action, options) => options?.onComplete?.(),
    begin: () => calls.push('begin'), giveChart: () => calls.push('issue'),
    openMap: () => calls.push('map'), report: () => calls.push('report'),
  };
  for (const stage of ['waiting', 'set', 'done', 'open-map', 'return-to-glun', 'finished']) {
    instructorConversation({ id: 'instructor' }, { ...context, stage });
  }
  assert.deepEqual(calls, ['begin', 'issue', 'map', 'report']);
});
