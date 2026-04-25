import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('schedule vertical grid lines are drawn at each day column edge', () => {
  assert.match(css, /linear-gradient\(to right, transparent calc\(100% - 1px\)/);
  assert.match(css, /background-size:\s*100% 50px, calc\(100% \/ 7\) 100%/);
});

test('drag start does not re-render and detach the pointer target', () => {
  const handler = app.match(/function onBlockPointerDown\([\s\S]*?\n}\n\nfunction onPointerMove/)?.[0] ?? '';
  assert.doesNotMatch(handler, /selectBlock\(block\.id\)/);
  assert.match(handler, /selectedId = block\.id/);
});


test('dragging uses a fixed body-level card so blocks can cross panel boundaries', () => {
  assert.match(app, /document\.body\.append\(card\)/);
  assert.match(app, /position = 'fixed'/);
});

test('keyboard Delete removes the selected block outside text editing', () => {
  assert.match(app, /event\.key === 'Delete'/);
  assert.match(app, /deleteSelectedBlock\(\)/);
  assert.match(app, /isTextEditingTarget\(event\.target\)/);
});

test('double clicking a block focuses its editable title', () => {
  assert.match(app, /addEventListener\('dblclick'/);
  assert.match(app, /focusBlockTitle\(card\)/);
  assert.match(app, /range\.selectNodeContents\(title\)/);
});

test('schedule snapping uses fixed one-to-seven day grid placement', () => {
  assert.match(app, /snapScheduleBlockToGrid\(block, boundsForArea\('schedule'\)\)/);
  assert.match(app, /clamp\(Number\(els\.widthInput\.value\), 1, 7\)/);
});

test('blocks expose eight resize handles for edge and corner resizing', () => {
  assert.match(app, /resizeDirections = \['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'\]/);
  assert.match(app, /dataset\.resizeDirection/);
  assert.match(app, /resizeFromDirection/);
});
