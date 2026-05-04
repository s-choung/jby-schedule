export const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
export const SCHEDULE_START_MINUTES = 0 * 60;
export const SCHEDULE_END_MINUTES = 24 * 60;
export const DEFAULT_BOARD_HEIGHT = 900;
export const MIN_BLOCK_WIDTH = 56;
export const MIN_BLOCK_HEIGHT = 28;
export const MAX_DAY_SPAN = 7;
export const SCHEDULE_COLUMN_INSET = 6;

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}

export function toISODate(input = new Date()) {
  const date = input instanceof Date ? input : new Date(`${input}T00:00:00`);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(input) {
  if (input instanceof Date) return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  const [year, month, day] = String(input).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(input, amount) {
  const date = parseLocalDate(input);
  date.setDate(date.getDate() + amount);
  return date;
}

export function getWeekStart(input = new Date()) {
  const date = parseLocalDate(input);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(date, mondayOffset);
}

export function getWeekDays(input = new Date()) {
  const monday = getWeekStart(input);
  return WEEKDAYS.map((weekday, index) => {
    const date = addDays(monday, index);
    return {
      weekday,
      iso: toISODate(date),
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  });
}

export function getDailyFilename(input = new Date()) {
  return `${toISODate(input)}.json`;
}

export function minutesToY(minutes, boardHeight = DEFAULT_BOARD_HEIGHT) {
  const span = SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES;
  return ((minutes - SCHEDULE_START_MINUTES) / span) * boardHeight;
}

export function yToMinutes(y, boardHeight = DEFAULT_BOARD_HEIGHT, snapMinutes = 30) {
  const span = SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES;
  const raw = SCHEDULE_START_MINUTES + (Number(y) / boardHeight) * span;
  const snapped = Math.round(raw / snapMinutes) * snapMinutes;
  return clamp(snapped, SCHEDULE_START_MINUTES, SCHEDULE_END_MINUTES);
}

export function timeLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}:00` : `${hours}:${String(mins).padStart(2, '0')}`;
}

export function getHourMarks(startHour = 0, endHour = 24) {
  return Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
}

export function cloneBlockForPaste(block, options = {}) {
  const offset = options.offset ?? 16;
  const id = options.id ?? `block_${Math.random().toString(36).slice(2, 10)}`;
  return {
    ...block,
    id,
    x: (block.x ?? 0) + offset,
    y: (block.y ?? 0) + offset,
  };
}


export function getDaySpanFromWidth(width, dayWidth, maxSpan = MAX_DAY_SPAN) {
  if (!Number.isFinite(dayWidth) || dayWidth <= 0) return 1;
  return clamp(Math.round(Number(width) / dayWidth), 1, maxSpan);
}

export function snapScheduleBlockToGrid(block, bounds = { width: 700, height: DEFAULT_BOARD_HEIGHT }, inset = SCHEDULE_COLUMN_INSET) {
  const dayWidth = bounds.width / 7;
  const requestedSpan = getDaySpanFromWidth(block.width ?? dayWidth, dayWidth);
  const day = clamp(Math.floor((block.x ?? 0) / dayWidth), 0, 7 - requestedSpan);
  const startMinutes = yToMinutes(block.y ?? 0, bounds.height);
  const rawEndMinutes = yToMinutes((block.y ?? 0) + (block.height ?? MIN_BLOCK_HEIGHT), bounds.height);
  const endMinutes = Math.max(startMinutes + 30, rawEndMinutes);
  return {
    ...block,
    area: 'schedule',
    day,
    daySpan: requestedSpan,
    x: day * dayWidth + inset,
    y: minutesToY(startMinutes, bounds.height),
    width: requestedSpan * dayWidth - inset * 2,
    height: Math.max(MIN_BLOCK_HEIGHT, minutesToY(endMinutes, bounds.height) - minutesToY(startMinutes, bounds.height)),
    startMinutes,
    endMinutes,
  };
}

export function createBlock(overrides = {}) {
  const id = overrides.id ?? `block_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    title: '새 일정',
    area: 'palette',
    day: 0,
    daySpan: 1,
    x: 24,
    y: 24,
    width: 148,
    height: 78,
    color: '#a7d3f5',
    textColor: '#111827',
    borderColor: '#111827',
    borderStyle: 'solid',
    pattern: 'none',
    radius: 20,
    startMinutes: SCHEDULE_START_MINUTES,
    endMinutes: SCHEDULE_START_MINUTES + 60,
    ...overrides,
    id,
  };
}

export function patchBlock(blocks, id, patch) {
  return blocks.map((block) => (block.id === id ? { ...block, ...patch } : block));
}

export function removeBlock(blocks, id) {
  return blocks.filter((block) => block.id !== id);
}

export function normalizeBlock(block, bounds = { width: 800, height: 900 }) {
  const width = clamp(block.width ?? 148, MIN_BLOCK_WIDTH, bounds.width);
  const height = clamp(block.height ?? 78, MIN_BLOCK_HEIGHT, bounds.height);
  return {
    ...block,
    width,
    height,
    x: clamp(block.x ?? 0, 0, Math.max(0, bounds.width - width)),
    y: clamp(block.y ?? 0, 0, Math.max(0, bounds.height - height)),
  };
}

export function emptyScheduleState(selectedDate = new Date()) {
  const isoDate = toISODate(selectedDate);
  return {
    version: 1,
    selectedDate: isoDate,
    weekStart: toISODate(getWeekStart(isoDate)),
    updatedAt: new Date().toISOString(),
    blocks: [],
  };
}
