import {
  addDays,
  clamp,
  cloneBlockForPaste,
  createBlock,
  emptyScheduleState,
  getDailyFilename,
  getHourMarks,
  getWeekDays,
  getWeekStart,
  minutesToY,
  normalizeBlock,
  patchBlock,
  removeBlock,
  snapScheduleBlockToGrid,
  timeLabel,
  toISODate,
  yToMinutes,
} from './scheduler-core.js';

const STORAGE_PREFIX = 'jby-schedule:';
const SAVE_DEBOUNCE_MS = 250;
const BOARD_HEIGHT = 900;
const resizeDirections = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'];

const PRESETS = [
  { title: '성인스터디', color: '#a7d3f5', width: 148, height: 72 },
  { title: '밴드', color: '#a7d3f5', width: 148, height: 72 },
  { title: '연애', color: '#a7d3f5', width: 136, height: 88 },
  { title: '청담동\n사장님', color: '#f8c6c6', width: 128, height: 72 },
  { title: '안강병원\n남음', color: '#c5f4c7', width: 150, height: 210 },
  { title: '안강병원\n격주', color: '#d9ffd9', pattern: 'cross', width: 116, height: 144 },
  { title: '출퇴근', color: '#e9eef5', width: 280, height: 34 },
  { title: '꿀잠', color: '#ffefa7', width: 340, height: 34 },
  { title: '운동', color: '#a7d3f5', width: 104, height: 42 },
  { title: '영어공부', color: '#a7d3f5', width: 112, height: 42 },
  { title: '스터디준비', color: '#a7d3f5', width: 118, height: 42 },
  { title: '후보\n메모', color: '#ffffff', pattern: 'stripe', borderColor: '#ef4444', width: 150, height: 92 },
];

const els = {
  addBlockBtn: document.querySelector('#addBlockBtn'),
  paletteCanvas: document.querySelector('#paletteCanvas'),
  presetList: document.querySelector('#presetList'),
  deleteBlockBtn: document.querySelector('#deleteBlockBtn'),
  titleInput: document.querySelector('#titleInput'),
  colorInput: document.querySelector('#colorInput'),
  textColorInput: document.querySelector('#textColorInput'),
  borderColorInput: document.querySelector('#borderColorInput'),
  radiusInput: document.querySelector('#radiusInput'),
  patternInput: document.querySelector('#patternInput'),
  borderStyleInput: document.querySelector('#borderStyleInput'),
  widthInput: document.querySelector('#widthInput'),
  heightInput: document.querySelector('#heightInput'),
  prevWeekBtn: document.querySelector('#prevWeekBtn'),
  nextWeekBtn: document.querySelector('#nextWeekBtn'),
  todayBtn: document.querySelector('#todayBtn'),
  dateInput: document.querySelector('#dateInput'),
  folderBtn: document.querySelector('#folderBtn'),
  exportBtn: document.querySelector('#exportBtn'),
  importInput: document.querySelector('#importInput'),
  weekTitle: document.querySelector('#weekTitle'),
  saveStatus: document.querySelector('#saveStatus'),
  dayHeader: document.querySelector('#dayHeader'),
  timeRail: document.querySelector('#timeRail'),
  scheduleBoard: document.querySelector('#scheduleBoard'),
  scheduleLayer: document.querySelector('#scheduleLayer'),
  template: document.querySelector('#blockTemplate'),
};

let state = loadStateForDate(toISODate(new Date()));
let selectedId = state.blocks[0]?.id ?? null;
let saveTimer = null;
let directoryHandle = null;
let activeInteraction = null;
let copiedBlock = null;

init();

function init() {
  renderPresets();
  renderTimeRail();
  bindEvents();
  render();
  setSaveStatus('로컬 저장 준비됨');
}

function bindEvents() {
  els.addBlockBtn.addEventListener('click', () => addBlockToPalette());
  els.deleteBlockBtn.addEventListener('click', deleteSelectedBlock);

  for (const input of [els.titleInput, els.colorInput, els.textColorInput, els.borderColorInput, els.radiusInput, els.patternInput, els.borderStyleInput, els.widthInput, els.heightInput]) {
    input.addEventListener('input', applyEditorPatch);
  }

  els.prevWeekBtn.addEventListener('click', () => changeDate(addDays(state.selectedDate, -7)));
  els.nextWeekBtn.addEventListener('click', () => changeDate(addDays(state.selectedDate, 7)));
  els.todayBtn.addEventListener('click', () => changeDate(new Date()));
  els.dateInput.addEventListener('change', (event) => changeDate(event.target.value));

  els.folderBtn.addEventListener('click', chooseSaveFolder);
  els.exportBtn.addEventListener('click', exportJson);
  els.importInput.addEventListener('change', importJson);

  els.scheduleBoard.addEventListener('dblclick', (event) => {
    if (event.target.closest('.block-card')) return;
    const rect = els.scheduleBoard.getBoundingClientRect();
    const boardX = event.clientX - rect.left;
    const boardY = event.clientY - rect.top;
    addBlockToSchedule(boardX, boardY);
  });

  window.addEventListener('keydown', onGlobalKeyDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('resize', render);
  window.addEventListener('beforeunload', () => {
    persistLocalNow();
  });
}

function renderPresets() {
  els.presetList.innerHTML = '';
  PRESETS.forEach((preset, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-chip';
    button.textContent = preset.title.replaceAll('\n', ' ');
    button.style.backgroundColor = preset.color;
    button.style.borderColor = preset.borderColor ?? '#111827';
    button.addEventListener('click', () => {
      addBlockToPalette({ ...preset, x: 24 + (index % 3) * 164, y: 78 + Math.floor(index / 3) * 104 });
    });
    els.presetList.append(button);
  });
}

function renderTimeRail() {
  els.timeRail.innerHTML = '';
  for (const hour of getHourMarks()) {
    const label = document.createElement('div');
    label.className = 'time-label';
    label.textContent = hour;
    label.style.top = `${minutesToY(hour * 60, BOARD_HEIGHT)}px`;
    els.timeRail.append(label);
  }
}

function render() {
  const weekDays = getWeekDays(state.selectedDate);
  els.dateInput.value = state.selectedDate;
  els.weekTitle.textContent = `${weekDays[0].iso} - ${weekDays[6].iso}`;
  renderDayHeader(weekDays);
  renderBlocks();
  syncEditor();
}

function renderDayHeader(weekDays) {
  els.dayHeader.innerHTML = '';
  weekDays.forEach((day) => {
    const cell = document.createElement('div');
    cell.className = `day-cell${day.iso === state.selectedDate ? ' is-selected' : ''}`;
    cell.innerHTML = `<span class="date-label">${day.dateLabel}</span><span class="weekday-label">${day.weekday}</span>`;
    els.dayHeader.append(cell);
  });
}

function renderBlocks() {
  els.paletteCanvas.querySelectorAll('.block-card').forEach((node) => node.remove());
  els.scheduleLayer.innerHTML = '';
  for (const block of state.blocks) {
    const parent = block.area === 'schedule' ? els.scheduleLayer : els.paletteCanvas;
    const card = createBlockElement(block);
    parent.append(card);
  }
}

function createBlockElement(block) {
  const card = els.template.content.firstElementChild.cloneNode(true);
  const title = card.querySelector('.block-title');
  const meta = card.querySelector('.block-meta');
  card.dataset.id = block.id;
  card.classList.toggle('is-selected', block.id === selectedId);
  card.classList.toggle('pattern-stripe', block.pattern === 'stripe');
  card.classList.toggle('pattern-cross', block.pattern === 'cross');
  card.classList.toggle('pattern-soft', block.pattern === 'soft');
  card.style.left = `${block.x}px`;
  card.style.top = `${block.y}px`;
  card.style.width = `${block.width}px`;
  card.style.height = `${block.height}px`;
  card.style.backgroundColor = block.color;
  card.style.color = block.textColor;
  card.style.borderColor = block.borderColor;
  card.style.borderStyle = block.borderStyle;
  card.style.borderRadius = `${block.radius}px`;
  title.textContent = block.title;
  meta.textContent = block.area === 'schedule' ? blockTimeText(block) : '';
  addResizeHandles(card);

  card.addEventListener('pointerdown', (event) => onBlockPointerDown(event, block));
  card.addEventListener('click', () => selectBlock(block.id));
  card.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    selectBlock(block.id);
    focusBlockTitle(card);
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && event.metaKey) deleteSelectedBlock();
  });
  title.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      title.blur();
    }
    event.stopPropagation();
  });
  title.addEventListener('blur', () => {
    const nextTitle = title.textContent.trim() || '새 일정';
    updateBlock(block.id, { title: nextTitle });
  });
  return card;
}

function addResizeHandles(card) {
  for (const direction of resizeDirections) {
    const handle = document.createElement('span');
    handle.className = `resize-handle resize-${direction}`;
    handle.dataset.resizeDirection = direction;
    handle.setAttribute('aria-hidden', 'true');
    card.append(handle);
  }
}

function blockTimeText(block) {
  const start = block.startMinutes ?? yToMinutes(block.y, BOARD_HEIGHT);
  const end = block.endMinutes ?? yToMinutes(block.y + block.height, BOARD_HEIGHT);
  return `${timeLabel(start)}-${timeLabel(end)}`;
}


function onGlobalKeyDown(event) {
  if (isTextEditingTarget(event.target)) return;
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
    deleteSelectedBlock();
    event.preventDefault();
    return;
  }
  const isCopy = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c';
  const isPaste = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v';
  const isDuplicate = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd';

  if (isCopy) {
    copySelectedBlock();
    event.preventDefault();
  } else if (isPaste || isDuplicate) {
    pasteCopiedBlock();
    event.preventDefault();
  }
}

function isTextEditingTarget(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

function copySelectedBlock() {
  const selected = findBlock(selectedId);
  if (!selected) return;
  copiedBlock = structuredCloneSafe(selected);
  setSaveStatus(`복사됨 · ${selected.title.replaceAll('\n', ' ')}`);
}

function pasteCopiedBlock() {
  if (!copiedBlock) return;
  let clone = cloneBlockForPaste(copiedBlock, { offset: 18 });
  if (clone.area === 'schedule') {
    clone = snapScheduleBlock(clone);
  } else {
    clone = normalizeBlock(clone, boundsForArea('palette'));
  }
  state = { ...state, blocks: [...state.blocks, clone] };
  selectedId = clone.id;
  render();
  scheduleSave();
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function focusBlockTitle(card) {
  const title = card.querySelector('.block-title');
  if (!title) return;
  title.focus();
  const range = document.createRange();
  range.selectNodeContents(title);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function onBlockPointerDown(event, block) {
  if (event.button !== 0) return;
  const handle = event.target.closest('.resize-handle');
  const resizeDirection = handle?.dataset.resizeDirection ?? 'se';
  const title = event.target.closest('.block-title');
  const isTitleFocused = title && document.activeElement === title;
  if (event.detail > 1) return;
  selectedId = block.id;
  event.currentTarget.classList.add('is-selected');
  syncEditor();
  if (isTitleFocused) return;

  event.preventDefault();
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const mode = handle ? 'resize' : 'drag';
  const grabOffsetX = event.clientX - rect.left;
  const grabOffsetY = event.clientY - rect.top;

  if (mode === 'drag') {
    card.style.position = 'fixed';
    card.style.left = `${rect.left}px`;
    card.style.top = `${rect.top}px`;
    card.style.width = `${rect.width}px`;
    card.style.height = `${rect.height}px`;
    card.style.margin = '0';
    card.style.pointerEvents = 'none';
    document.body.append(card);
  }

  card.setPointerCapture?.(event.pointerId);
  card.classList.add('is-dragging');
  activeInteraction = {
    mode,
    id: block.id,
    pointerId: event.pointerId,
    originClientX: event.clientX,
    originClientY: event.clientY,
    originX: block.x,
    originY: block.y,
    originWidth: block.width,
    originHeight: block.height,
    originArea: block.area,
    grabOffsetX,
    grabOffsetY,
    resizeDirection,
    liveElement: card,
  };
}

function onPointerMove(event) {
  if (!activeInteraction) return;
  const dx = event.clientX - activeInteraction.originClientX;
  const dy = event.clientY - activeInteraction.originClientY;

  if (activeInteraction.mode === 'resize') {
    const preview = resizeFromDirection(activeInteraction, dx, dy, boundsForArea(activeInteraction.originArea));
    activeInteraction.liveElement.style.left = `${preview.x}px`;
    activeInteraction.liveElement.style.top = `${preview.y}px`;
    activeInteraction.liveElement.style.width = `${preview.width}px`;
    activeInteraction.liveElement.style.height = `${preview.height}px`;
    return;
  }

  activeInteraction.liveElement.style.left = `${event.clientX - activeInteraction.grabOffsetX}px`;
  activeInteraction.liveElement.style.top = `${event.clientY - activeInteraction.grabOffsetY}px`;
}

function onPointerUp(event) {
  if (!activeInteraction) return;
  const interaction = activeInteraction;
  activeInteraction = null;
  interaction.liveElement.classList.remove('is-dragging');

  const block = findBlock(interaction.id);
  if (!block) return;

  if (interaction.mode === 'resize') {
    const dx = event.clientX - interaction.originClientX;
    const dy = event.clientY - interaction.originClientY;
    const patch = resizeFromDirection(interaction, dx, dy, boundsForArea(block.area));
    updateBlock(interaction.id, withTimePatch({ ...block, ...patch }, patch));
    return;
  }

  const nextArea = areaFromPoint(event.clientX, event.clientY) ?? interaction.originArea;
  const point = pointInArea(event.clientX, event.clientY, nextArea);
  const bounds = boundsForArea(nextArea);
  interaction.liveElement.remove();
  let draft = {
    ...block,
    area: nextArea,
    x: point.x - interaction.grabOffsetX,
    y: point.y - interaction.grabOffsetY,
  };

  if (nextArea === 'schedule') {
    draft = snapScheduleBlock(draft);
  } else {
    draft = normalizeBlock(draft, bounds);
  }
  updateBlock(interaction.id, draft);
}

function resizeFromDirection(interaction, dx, dy, bounds) {
  const direction = interaction.resizeDirection;
  let x = interaction.originX;
  let y = interaction.originY;
  let width = interaction.originWidth;
  let height = interaction.originHeight;

  if (direction.includes('e')) {
    width = interaction.originWidth + dx;
  }
  if (direction.includes('s')) {
    height = interaction.originHeight + dy;
  }
  if (direction.includes('w')) {
    x = interaction.originX + dx;
    width = interaction.originWidth - dx;
  }
  if (direction.includes('n')) {
    y = interaction.originY + dy;
    height = interaction.originHeight - dy;
  }

  width = Math.max(56, width);
  height = Math.max(28, height);
  const maxX = Math.max(0, bounds.width - width);
  const maxY = Math.max(0, bounds.height - height);
  return {
    x: clamp(x, 0, maxX),
    y: clamp(y, 0, maxY),
    width: clamp(width, 56, bounds.width),
    height: clamp(height, 28, bounds.height),
  };
}

function snapScheduleBlock(block) {
  return snapScheduleBlockToGrid(block, boundsForArea('schedule'));
}

function withTimePatch(block, patch) {
  if (block.area !== 'schedule') return patch;
  return snapScheduleBlock({ ...block, ...patch });
}

function areaFromPoint(clientX, clientY) {
  if (containsPoint(els.scheduleBoard.getBoundingClientRect(), clientX, clientY)) return 'schedule';
  if (containsPoint(els.paletteCanvas.getBoundingClientRect(), clientX, clientY)) return 'palette';
  return null;
}

function pointInArea(clientX, clientY, area) {
  const rect = (area === 'schedule' ? els.scheduleBoard : els.paletteCanvas).getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function boundsForArea(area) {
  const rect = (area === 'schedule' ? els.scheduleBoard : els.paletteCanvas).getBoundingClientRect();
  return { width: rect.width, height: rect.height || BOARD_HEIGHT };
}

function containsPoint(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function addBlockToPalette(overrides = {}) {
  const block = createBlock({ ...overrides, area: 'palette' });
  state = { ...state, blocks: [...state.blocks, normalizeBlock(block, boundsForArea('palette'))] };
  selectedId = block.id;
  render();
  scheduleSave();
}

function addBlockToSchedule(x, y) {
  const block = createBlock({ title: '새 일정', area: 'schedule', x: x - 66, y, width: 132, height: 50 });
  const snapped = snapScheduleBlock(block);
  state = { ...state, blocks: [...state.blocks, snapped] };
  selectedId = snapped.id;
  render();
  scheduleSave();
}

function deleteSelectedBlock() {
  if (!selectedId) return;
  state = { ...state, blocks: removeBlock(state.blocks, selectedId) };
  selectedId = state.blocks[0]?.id ?? null;
  render();
  scheduleSave();
}

function selectBlock(id) {
  selectedId = id;
  render();
}

function findBlock(id) {
  return state.blocks.find((block) => block.id === id);
}

function updateBlock(id, patch) {
  const nextPatch = { ...patch };
  delete nextPatch.id;
  state = { ...state, blocks: patchBlock(state.blocks, id, nextPatch) };
  render();
  scheduleSave();
}

function applyEditorPatch(event) {
  if (!selectedId) return;
  const selected = findBlock(selectedId);
  if (!selected) return;
  const bounds = selected.area === 'schedule' ? boundsForArea('schedule') : null;
  const dayWidth = bounds ? bounds.width / 7 : 0;
  const widthValue = selected.area === 'schedule'
    ? clamp(Number(els.widthInput.value), 1, 7) * dayWidth
    : Number(els.widthInput.value);
  const patch = {
    title: els.titleInput.value,
    color: els.colorInput.value,
    textColor: els.textColorInput.value,
    borderColor: els.borderColorInput.value,
    radius: Number(els.radiusInput.value),
    pattern: els.patternInput.value,
    borderStyle: els.borderStyleInput.value,
    width: widthValue,
    height: Number(els.heightInput.value),
  };
  updateBlock(selectedId, selected.area === 'schedule' ? withTimePatch(selected, patch) : patch);
}

function syncEditor() {
  const selected = findBlock(selectedId);
  const disabled = !selected;
  for (const input of [els.titleInput, els.colorInput, els.textColorInput, els.borderColorInput, els.radiusInput, els.patternInput, els.borderStyleInput, els.widthInput, els.heightInput, els.deleteBlockBtn]) {
    input.disabled = disabled;
  }
  if (!selected) {
    els.titleInput.value = '';
    return;
  }
  if (document.activeElement !== els.titleInput) els.titleInput.value = selected.title;
  els.colorInput.value = selected.color;
  els.textColorInput.value = selected.textColor;
  els.borderColorInput.value = selected.borderColor;
  els.radiusInput.value = selected.radius;
  els.patternInput.value = selected.pattern;
  els.borderStyleInput.value = selected.borderStyle;
  if (selected.area === 'schedule') {
    els.widthInput.min = '1';
    els.widthInput.max = '7';
    els.widthInput.step = '1';
    els.widthInput.value = selected.daySpan ?? 1;
  } else {
    els.widthInput.min = '56';
    els.widthInput.removeAttribute('max');
    els.widthInput.step = '4';
    els.widthInput.value = Math.round(selected.width);
  }
  els.heightInput.value = Math.round(selected.height);
}

function changeDate(input) {
  persistLocalNow();
  const nextDate = toISODate(input);
  state = loadStateForDate(nextDate);
  selectedId = state.blocks[0]?.id ?? null;
  render();
  scheduleSave();
}

function loadStateForDate(isoDate) {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${isoDate}`);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return normalizeState({ ...parsed, selectedDate: isoDate });
    } catch (error) {
      console.warn('저장 데이터를 읽을 수 없습니다.', error);
    }
  }
  return seedState(isoDate);
}

function seedState(isoDate) {
  const initial = emptyScheduleState(isoDate);
  return {
    ...initial,
    blocks: [
      createBlock({ title: '성인스터디', x: 28, y: 120, width: 148, height: 72 }),
      createBlock({ title: '밴드', x: 200, y: 112, width: 148, height: 72 }),
      createBlock({ title: '연애', x: 372, y: 118, width: 148, height: 82 }),
      createBlock({ title: '후보1\n아버님이 교수인데\n애매함.', x: 24, y: 290, width: 180, height: 90, color: '#ffffff', pattern: 'stripe', borderColor: '#ef4444' }),
      createBlock({ title: '후보3\n3개월뒤 가능해보임\n교대역', x: 224, y: 292, width: 190, height: 90, color: '#ffffff', pattern: 'stripe', borderColor: '#ef4444' }),
    ],
  };
}

function normalizeState(nextState) {
  const selectedDate = toISODate(nextState.selectedDate ?? new Date());
  return {
    version: 1,
    ...nextState,
    selectedDate,
    weekStart: toISODate(getWeekStart(selectedDate)),
    blocks: Array.isArray(nextState.blocks) ? nextState.blocks.map((block) => createBlock(block)) : [],
  };
}

function serializeState() {
  return JSON.stringify(
    {
      ...state,
      weekStart: toISODate(getWeekStart(state.selectedDate)),
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

function scheduleSave() {
  setSaveStatus('저장 대기 중...');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    persistLocalNow();
    await persistFileNow();
  }, SAVE_DEBOUNCE_MS);
}

function persistLocalNow() {
  localStorage.setItem(`${STORAGE_PREFIX}${state.selectedDate}`, serializeState());
  setSaveStatus(`로컬 저장됨 · ${getDailyFilename(state.selectedDate)}`);
}

async function persistFileNow() {
  if (!directoryHandle) return;
  try {
    const fileHandle = await directoryHandle.getFileHandle(getDailyFilename(state.selectedDate), { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(serializeState());
    await writable.close();
    setSaveStatus(`파일 저장됨 · ${getDailyFilename(state.selectedDate)}`);
  } catch (error) {
    console.error(error);
    setSaveStatus('파일 저장 실패 · 로컬 저장은 유지됨');
  }
}

async function chooseSaveFolder() {
  if (!('showDirectoryPicker' in window)) {
    setSaveStatus('이 브라우저는 폴더 자동 저장을 지원하지 않습니다');
    return;
  }
  try {
    directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await persistFileNow();
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error(error);
      setSaveStatus('폴더 선택 실패');
    }
  }
}

function exportJson() {
  const blob = new Blob([serializeState()], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = getDailyFilename(state.selectedDate);
  link.click();
  URL.revokeObjectURL(link.href);
  setSaveStatus(`내보내기 완료 · ${link.download}`);
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    state = normalizeState({ ...parsed, selectedDate: parsed.selectedDate ?? state.selectedDate });
    selectedId = state.blocks[0]?.id ?? null;
    render();
    scheduleSave();
    setSaveStatus(`가져오기 완료 · ${file.name}`);
  } catch (error) {
    console.error(error);
    setSaveStatus('JSON 가져오기 실패');
  } finally {
    event.target.value = '';
  }
}

function setSaveStatus(message) {
  els.saveStatus.textContent = message;
}
