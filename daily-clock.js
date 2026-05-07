const TOTAL_MINUTES = 1440;
const CLOCK_RADIUS = 390;
const INNER_RADIUS = 30;
const CENTER = CLOCK_RADIUS + 36;
const SVG_SIZE = CENTER * 2;

function minutesToAngle(minutes) {
  return (minutes / TOTAL_MINUTES) * 360 - 90;
}

function polarToXY(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function piePath(startMin, endMin, outerR) {
  const sa = minutesToAngle(startMin);
  const ea = minutesToAngle(endMin);
  const sweep = ((ea - sa + 360) % 360) || 360;
  const largeArc = sweep > 180 ? 1 : 0;
  const p1 = polarToXY(sa, outerR);
  const p2 = polarToXY(sa + sweep, outerR);
  return [
    `M ${CENTER} ${CENTER}`,
    `L ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    'Z',
  ].join(' ');
}

function hourLabel(h) {
  if (h === 0) return '0시';
  if (h === 6) return '6시';
  if (h === 12) return '정오';
  if (h === 18) return '18시';
  return `${h}`;
}

function fmtTime(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm === 0 ? `${h}:00` : `${h}:${String(mm).padStart(2, '0')}`;
}

let selectedClockBlockId = null;
let onUpdateCallback = null;
let onAddBlockCallback = null;

function xyToMinutes(x, y) {
  const dx = x - CENTER;
  const dy = y - CENTER;
  let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  if (angle < 0) angle += 360;
  return Math.round((angle / 360) * TOTAL_MINUTES / 30) * 30;
}

function buildClockSVG(blocks, onBlockClick, onUpdate, onAddBlock) {
  onAddBlockCallback = onAddBlock;
  onUpdateCallback = onUpdate;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.maxWidth = '640px';
  svg.style.maxHeight = '640px';

  // background circle — click to add block
  const bg = document.createElementNS(ns, 'circle');
  bg.setAttribute('cx', CENTER);
  bg.setAttribute('cy', CENTER);
  bg.setAttribute('r', CLOCK_RADIUS);
  bg.setAttribute('fill', '#f5f3eb');
  bg.setAttribute('stroke', '#1f2937');
  bg.setAttribute('stroke-width', '2.5');
  svg.append(bg);

  // hour tick marks (outside edge only)
  for (let h = 0; h < 24; h++) {
    const angle = minutesToAngle(h * 60);
    const isMajor = h % 6 === 0;
    const outer = polarToXY(angle, CLOCK_RADIUS);
    const inner = polarToXY(angle, CLOCK_RADIUS - (isMajor ? 14 : 7));
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', inner.x);
    line.setAttribute('y1', inner.y);
    line.setAttribute('x2', outer.x);
    line.setAttribute('y2', outer.y);
    line.setAttribute('stroke', isMajor ? 'rgba(31,41,55,0.4)' : 'rgba(31,41,55,0.15)');
    line.setAttribute('stroke-width', isMajor ? '2' : '1');
    svg.append(line);
  }

  // schedule pie slices
  blocks.forEach((block) => {
    if (block.area !== 'schedule') return;
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', piePath(block.startMinutes, block.endMinutes, CLOCK_RADIUS - 2));
    path.setAttribute('fill', block.color || '#a7d3f5');
    path.setAttribute('stroke', block.borderColor || '#1f2937');
    path.setAttribute('stroke-width', block.id === selectedClockBlockId ? '3' : '1.5');
    path.setAttribute('opacity', '0.88');
    path.style.cursor = 'pointer';
    path.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedClockBlockId = block.id;
      onBlockClick(block.id);
    });
    path.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      selectedClockBlockId = block.id;
      onBlockClick(block.id);
      setTimeout(() => {
        const titleInput = document.querySelector('#clockTitle');
        if (titleInput) { titleInput.focus(); titleInput.select(); }
      }, 50);
    });

    const tooltip = document.createElementNS(ns, 'title');
    tooltip.textContent = `${block.title} (${fmtTime(block.startMinutes)}–${fmtTime(block.endMinutes)})`;
    path.append(tooltip);
    svg.append(path);

    // label inside slice
    const midMin = (block.startMinutes + block.endMinutes) / 2;
    const midAngle = minutesToAngle(midMin);
    const span = block.endMinutes - block.startMinutes;
    const labelR = CLOCK_RADIUS * 0.55;
    const lp = polarToXY(midAngle, labelR);

    if (span >= 20) {
      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', lp.x);
      text.setAttribute('y', lp.y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-size', span >= 180 ? '28' : span >= 120 ? '22' : span >= 60 ? '18' : '14');
      text.setAttribute('font-weight', '800');
      text.setAttribute('fill', block.textColor || '#111827');
      text.setAttribute('pointer-events', 'none');
      text.textContent = block.title.replace(/\n/g, ' ').slice(0, 12);
      svg.append(text);
    }
  });

  // hour labels (on top of slices) — all 24 hours
  for (let h = 0; h < 24; h++) {
    const angle = minutesToAngle(h * 60);
    const isMajor = h % 6 === 0;
    const labelPos = polarToXY(angle, CLOCK_RADIUS + 18);
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', labelPos.x);
    text.setAttribute('y', labelPos.y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', isMajor ? '44' : '32');
    text.setAttribute('font-weight', isMajor ? '900' : '700');
    text.setAttribute('fill', '#1f2937');
    text.textContent = hourLabel(h);
    svg.append(text);
  }

  // center dot
  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', CENTER);
  dot.setAttribute('cy', CENTER);
  dot.setAttribute('r', INNER_RADIUS);
  dot.setAttribute('fill', '#fffdf7');
  dot.setAttribute('stroke', '#1f2937');
  dot.setAttribute('stroke-width', '1.5');
  svg.append(dot);

  return svg;
}

function buildClockEditor(block, onSave) {
  const div = document.createElement('div');
  div.className = 'clock-editor';
  if (!block) {
    div.innerHTML = '<p style="text-align:center;color:#6b7280;font-size:.85rem">블록을 클릭하면 편집할 수 있습니다</p>';
    return div;
  }
  div.innerHTML = `
    <div class="clock-edit-row">
      <label><span>이름</span><input type="text" id="clockTitle" value="${block.title.replace(/"/g, '&quot;')}" /></label>
    </div>
    <div class="clock-edit-row">
      <label><span>시작</span><input type="time" id="clockStart" value="${toTimeStr(block.startMinutes)}" step="1800" /></label>
      <label><span>종료</span><input type="time" id="clockEnd" value="${toTimeStr(block.endMinutes)}" step="1800" /></label>
    </div>
  `;

  const titleInput = div.querySelector('#clockTitle');
  const startInput = div.querySelector('#clockStart');
  const endInput = div.querySelector('#clockEnd');

  const save = () => {
    onSave(block.id, {
      title: titleInput.value || '새 일정',
      startMinutes: timeStrToMin(startInput.value),
      endMinutes: timeStrToMin(endInput.value),
    });
  };

  titleInput.addEventListener('input', save);
  startInput.addEventListener('change', save);
  endInput.addEventListener('change', save);

  return div;
}

function toTimeStr(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeStrToMin(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + (m || 0);
}

export { buildClockSVG, buildClockEditor, selectedClockBlockId };
