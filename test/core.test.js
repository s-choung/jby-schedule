import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  cloneBlockForPaste,
  createBlock,
  getDaySpanFromWidth,
  snapScheduleBlockToGrid,
  getDailyFilename,
  getHourMarks,
  getWeekDays,
  minutesToY,
  patchBlock,
  yToMinutes,
} from '../scheduler-core.js';

test('getWeekDays returns Monday-first week labels with dates', () => {
  const days = getWeekDays('2026-04-25');
  assert.deepEqual(
    days.map((day) => `${day.dateLabel} ${day.weekday}`),
    ['4/20 월', '4/21 화', '4/22 수', '4/23 목', '4/24 금', '4/25 토', '4/26 일'],
  );
  assert.equal(days[5].iso, '2026-04-25');
});

test('getDailyFilename formats selected date as daily JSON name', () => {
  assert.equal(getDailyFilename('2026-04-25'), '2026-04-25.json');
});

test('createBlock sets editable defaults and caller overrides', () => {
  const block = createBlock({ title: '밴드', area: 'palette', color: '#a7d3f5', x: 11 });
  assert.equal(block.title, '밴드');
  assert.equal(block.area, 'palette');
  assert.equal(block.color, '#a7d3f5');
  assert.equal(block.x, 11);
  assert.equal(block.borderStyle, 'solid');
  assert.ok(block.id.startsWith('block_'));
});

test('patchBlock updates only the matching block', () => {
  const first = createBlock({ id: 'a', title: 'A' });
  const second = createBlock({ id: 'b', title: 'B' });
  const result = patchBlock([first, second], 'b', { title: 'B2', width: 180 });
  assert.equal(result[0].title, 'A');
  assert.equal(result[1].title, 'B2');
  assert.equal(result[1].width, 180);
});

test('clamp constrains values to inclusive bounds', () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(7, 0, 10), 7);
});

test('time and y conversion round-trip using configured schedule range', () => {
  assert.equal(minutesToY(6 * 60), 0);
  assert.equal(minutesToY(24 * 60), 900);
  assert.equal(yToMinutes(450), 15 * 60);
});


test('cloneBlockForPaste duplicates a block with a new id and offset position', () => {
  const original = createBlock({ id: 'original', title: '연애', x: 20, y: 30, area: 'schedule', day: 2 });
  const clone = cloneBlockForPaste(original, { offset: 16, id: 'copy' });
  assert.equal(clone.id, 'copy');
  assert.equal(clone.title, '연애');
  assert.equal(clone.area, 'schedule');
  assert.equal(clone.day, 2);
  assert.equal(clone.x, 36);
  assert.equal(clone.y, 46);
  assert.equal(original.x, 20);
});


test('getHourMarks returns every hour from 6 through 24', () => {
  assert.deepEqual(getHourMarks(), [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});


test('getDaySpanFromWidth locks schedule widths to one through seven day spans', () => {
  assert.equal(getDaySpanFromWidth(40, 100), 1);
  assert.equal(getDaySpanFromWidth(260, 100), 3);
  assert.equal(getDaySpanFromWidth(720, 100), 7);
});

test('snapScheduleBlockToGrid fits blocks inside weekday columns and clamps span at week end', () => {
  const snapped = snapScheduleBlockToGrid(
    createBlock({ area: 'schedule', x: 242, y: 51, width: 260, height: 100 }),
    { width: 700, height: 900 },
  );
  assert.equal(snapped.day, 2);
  assert.equal(snapped.daySpan, 3);
  assert.equal(snapped.x, 206);
  assert.equal(snapped.width, 288);
  assert.equal(snapped.startMinutes, 420);

  const endClamped = snapScheduleBlockToGrid(
    createBlock({ area: 'schedule', x: 650, y: 0, width: 620, height: 50 }),
    { width: 700, height: 900 },
  );
  assert.equal(endClamped.day, 1);
  assert.equal(endClamped.daySpan, 6);
  assert.equal(endClamped.x, 106);
  assert.equal(endClamped.width, 588);
});
