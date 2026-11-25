export const DPI = 300;

export function mmToPixels(mm, dpi = DPI) {
  return Math.round((Number(mm) / 25.4) * dpi);
}

export function inchesToPixels(inches, dpi = DPI) {
  return Math.round(Number(inches) * dpi);
}

export function pixelsToMm(pixels, dpi = DPI) {
  return (Number(pixels) / dpi) * 25.4;
}

export function toPixels(value, unit, dpi = DPI) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 1;
  if (unit === 'in') return Math.round(amount * dpi);
  if (unit === 'px') return Math.round(amount);
  return mmToPixels(amount, dpi);
}

function template(id, name, category, widthMm, heightMm, note) {
  return {
    id, name, category, widthMm, heightMm,
    widthPx: mmToPixels(widthMm),
    heightPx: mmToPixels(heightMm),
    note,
  };
}

export const TEMPLATE_PRESETS = [
  template('passport-2x2', 'Passport · 2 × 2 in', 'Passport', 50.8, 50.8, '600 × 600 px at 300 DPI'),
  template('bd-35x45', 'Bangladesh / Visa · 35 × 45 mm', 'Passport', 35, 45, '413 × 531 px at 300 DPI'),
  template('intl-40x50', 'International ID · 40 × 50 mm', 'Passport', 40, 50, '472 × 591 px at 300 DPI'),
  template('drivers-30x40', "Driver's licence · 30 × 40 mm", 'Identity', 30, 40, '354 × 472 px at 300 DPI'),
  template('employee-35x50', 'Employee badge · 35 × 50 mm', 'Identity', 35, 50, '413 × 591 px at 300 DPI'),
  template('student-25x30', 'Student card · 25 × 30 mm', 'Identity', 25, 30, '295 × 354 px at 300 DPI'),
];

export const PAPER_PRESETS = {
  '4r': { id: '4r', name: '4R · 4 × 6 in', widthPx: inchesToPixels(4), heightPx: inchesToPixels(6), widthIn: 4, heightIn: 6 },
  a4: { id: 'a4', name: 'A4 · 210 × 297 mm', widthPx: mmToPixels(210), heightPx: mmToPixels(297), widthMm: 210, heightMm: 297 },
};

export function getTemplate(id) {
  return TEMPLATE_PRESETS.find((item) => item.id === id) ?? TEMPLATE_PRESETS[1];
}

export function createCustomTemplate(width, height, unit = 'mm') {
  const widthPx = toPixels(width, unit);
  const heightPx = toPixels(height, unit);
  return {
    id: 'custom',
    name: 'Custom size',
    category: 'Custom',
    widthPx,
    heightPx,
    widthMm: pixelsToMm(widthPx),
    heightMm: pixelsToMm(heightPx),
    note: `${widthPx} × ${heightPx} px · 300 DPI export`,
  };
}

export function bestSheetGrid(photoWidth, photoHeight, pageWidth, pageHeight, copies, margin = 36, spacing = 22) {
  const count = Math.max(1, Math.min(60, Math.round(Number(copies) || 1)));
  let best = { columns: 1, rows: count, score: 0 };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const cellWidth = (pageWidth - margin * 2 - spacing * (columns - 1)) / columns;
    const cellHeight = (pageHeight - margin * 2 - spacing * (rows - 1)) / rows;
    const scale = Math.min(1, cellWidth / photoWidth, cellHeight / photoHeight);
    const score = scale > 0 ? scale : 0;
    if (score > best.score) best = { columns, rows, score };
  }
  return best;
}
