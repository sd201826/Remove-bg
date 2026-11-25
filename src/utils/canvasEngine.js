import { loadImage } from './imageIO.js';
import { PAPER_PRESETS, bestSheetGrid } from '../data/templates.js';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function safeFilter(value) {
  return value || 'none';
}

function imageFilter(adjustments = {}) {
  const brightness = Number(adjustments.brightness ?? 100);
  const contrast = Number(adjustments.contrast ?? 100);
  const saturation = Number(adjustments.saturation ?? 100);
  const warmth = Math.max(-100, Math.min(100, Number(adjustments.warmth ?? 0)));
  const sepia = Math.max(0, warmth) * 0.32;
  const hue = Math.min(18, Math.abs(warmth) * 0.18) * (warmth < 0 ? -1 : 1);
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;
}

function drawBackground(ctx, state, width, height, backgroundImage) {
  const background = state.background ?? { type: 'transparent' };
  if (background.type === 'solid') {
    ctx.fillStyle = background.color || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === 'image' && backgroundImage) {
    const fit = Math.max(width / backgroundImage.width, height / backgroundImage.height) * (background.scale || 1);
    const drawWidth = backgroundImage.width * fit;
    const drawHeight = backgroundImage.height * fit;
    const x = (width - drawWidth) / 2 + (Number(background.x) || 0) * width / 100;
    const y = (height - drawHeight) / 2 + (Number(background.y) || 0) * height / 100;
    ctx.save();
    ctx.filter = safeFilter(`blur(${Math.max(0, Number(background.blur) || 0)}px)`);
    ctx.drawImage(backgroundImage, x, y, drawWidth, drawHeight);
    ctx.restore();
  }
}

function getPhotoPlacement(image, state, width, height) {
  const adjustments = state.adjustments ?? {};
  const contain = Math.min((width * 0.94) / image.width, (height * 0.94) / image.height);
  const scale = contain * Math.max(0.1, Number(adjustments.scale ?? 1));
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  return {
    x: (width - drawWidth) / 2 + (Number(adjustments.x) || 0) * width / 100,
    y: (height - drawHeight) / 2 + (Number(adjustments.y) || 0) * height / 100,
    width: drawWidth,
    height: drawHeight,
    rotation: (Number(adjustments.rotation) || 0) * Math.PI / 180,
  };
}

function drawImageAtPlacement(ctx, image, placement, centerX, centerY) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(placement.rotation);
  ctx.drawImage(image, placement.x - centerX, placement.y - centerY, placement.width, placement.height);
  ctx.restore();
}

function strokePath(ctx, stroke, width, height) {
  const points = stroke.points ?? [];
  if (!points.length) return;
  const radius = Math.max(1, (Number(stroke.radius) || 0.02) * width);
  ctx.beginPath();
  ctx.lineWidth = radius * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (points.length === 1) {
    const x = points[0].x * width;
    const y = points[0].y * height;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  } else {
    ctx.moveTo(points[0].x * width, points[0].y * height);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x * width, points[index].y * height);
    }
  }
}

function applyBrushStrokes(ctx, strokes, originalImage, placement, width, height) {
  if (!strokes?.length) return;
  for (const stroke of strokes) {
    if (!stroke.points?.length) continue;
    ctx.save();
    strokePath(ctx, stroke, width, height);
    const softness = 1 - Math.max(0, Math.min(100, Number(stroke.hardness ?? 82))) / 100;
    if (stroke.mode === 'restore' && originalImage) {
      const mask = makeCanvas(width, height);
      const maskCtx = mask.getContext('2d');
      strokePath(maskCtx, stroke, width, height);
      maskCtx.strokeStyle = '#FFFFFF';
      maskCtx.fillStyle = '#FFFFFF';
      maskCtx.shadowBlur = softness * Math.max(2, (Number(stroke.radius) || 0.02) * width * 1.15);
      maskCtx.shadowColor = 'rgba(255,255,255,0.8)';
      maskCtx.stroke();
      if (stroke.points.length === 1) maskCtx.fill();
      const restoreLayer = makeCanvas(width, height);
      const restoreCtx = restoreLayer.getContext('2d');
      drawImageAtPlacement(restoreCtx, originalImage, placement, width / 2, height / 2);
      restoreCtx.globalCompositeOperation = 'destination-in';
      restoreCtx.drawImage(mask, 0, 0);
      ctx.drawImage(restoreLayer, 0, 0);
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.shadowBlur = softness * Math.max(2, (Number(stroke.radius) || 0.02) * width * 1.15);
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#000000';
      ctx.stroke();
      if (stroke.points.length === 1) ctx.fill();
    }
    ctx.restore();
  }
}

function drawAlignmentGuide(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.68;
  ctx.strokeStyle = '#42d6b4';
  ctx.fillStyle = 'rgba(66,214,180,0.07)';
  ctx.lineWidth = Math.max(1.5, width / 380);
  const cx = width / 2;
  const headTop = height * 0.15;
  const headW = width * 0.31;
  const headH = height * 0.43;
  ctx.beginPath();
  ctx.ellipse(cx, headTop + headH * 0.48, headW / 2, headH / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.65, height * 0.86);
  ctx.bezierCurveTo(cx - headW * 0.76, height * 0.70, cx - headW * 0.55, height * 0.61, cx - headW * 0.22, height * 0.59);
  ctx.quadraticCurveTo(cx, height * 0.66, cx + headW * 0.22, height * 0.59);
  ctx.bezierCurveTo(cx + headW * 0.55, height * 0.61, cx + headW * 0.76, height * 0.70, cx + headW * 0.65, height * 0.86);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.setLineDash([width * 0.012, width * 0.009]);
  ctx.lineWidth = Math.max(1, width / 500);
  ctx.beginPath();
  ctx.moveTo(width * 0.12, height * 0.39);
  ctx.lineTo(width * 0.88, height * 0.39);
  ctx.moveTo(width * 0.12, height * 0.59);
  ctx.lineTo(width * 0.88, height * 0.59);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `${Math.max(9, width * 0.023)}px sans-serif`;
  ctx.fillStyle = '#2aa88c';
  ctx.fillText('EYE LINE', width * 0.04, height * 0.375);
  ctx.fillText('CHIN GUIDE', width * 0.04, height * 0.575);
  ctx.restore();
}

async function renderSingle(state, canvas, { originalOnly = false, showGuide = true } = {}) {
  const template = state.template;
  const width = Math.max(1, Math.round(template.widthPx));
  const height = Math.max(1, Math.round(template.heightPx));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
  ctx.clearRect(0, 0, width, height);
  const source = state.image ? await loadImage(state.image) : null;
  if (!source) return canvas;
  const backgroundSource = !originalOnly && state.background?.type === 'image' && state.background.image
    ? await loadImage(state.background.image)
    : null;
  if (originalOnly) {
    const originalPlacement = getPhotoPlacement(source, state, width, height);
    drawImageAtPlacement(ctx, source, originalPlacement, width / 2, height / 2);
    if (showGuide && state.guide) drawAlignmentGuide(ctx, width, height);
    return canvas;
  }
  drawBackground(ctx, state, width, height, backgroundSource);
  const foregroundSource = state.cutout ? await loadImage(state.cutout) : source;
  const placement = getPhotoPlacement(foregroundSource, state, width, height);
  const foreground = makeCanvas(width, height);
  const fgCtx = foreground.getContext('2d', { alpha: true, willReadFrequently: false });
  fgCtx.filter = imageFilter(state.adjustments);
  if (Number(state.adjustments?.feather) > 0 && state.cutout) {
    fgCtx.filter += ` blur(${Math.min(8, Number(state.adjustments.feather) / 7)}px)`;
  }
  drawImageAtPlacement(fgCtx, foregroundSource, placement, width / 2, height / 2);
  fgCtx.filter = 'none';
  applyBrushStrokes(fgCtx, state.brushStrokes, source, placement, width, height);
  ctx.drawImage(foreground, 0, 0);
  if (showGuide && state.guide) drawAlignmentGuide(ctx, width, height);
  return canvas;
}

export async function renderArtwork(state, canvas, options = {}) {
  if (!state.image) {
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
  }
  if (!state.compareMode || options.forceSingle) {
    return renderSingle(state, canvas, { showGuide: options.showGuide !== false });
  }
  const width = state.template.widthPx;
  const height = state.template.heightPx;
  const before = makeCanvas(width, height);
  const after = makeCanvas(width, height);
  await renderSingle(state, before, { originalOnly: true, showGuide: false });
  await renderSingle({ ...state, guide: false }, after, { showGuide: false });
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width / 2, height);
  ctx.clip();
  ctx.drawImage(before, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(width / 2, 0, width / 2, height);
  ctx.clip();
  ctx.drawImage(after, 0, 0);
  ctx.restore();
  ctx.fillStyle = '#22c9a4';
  ctx.fillRect(width / 2 - Math.max(1, width / 650), 0, Math.max(2, width / 325), height);
  ctx.font = `${Math.max(10, width * 0.03)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BEFORE', width * 0.035, height * 0.06);
  ctx.fillText('AFTER', width * 0.535, height * 0.06);
  return canvas;
}

export async function createRenderedCanvas(state) {
  const canvas = makeCanvas(state.template.widthPx, state.template.heightPx);
  const exportState = { ...state, compareMode: false, guide: false };
  await renderArtwork(exportState, canvas, { forceSingle: true });
  return canvas;
}

export async function createPrintSheet(state, options = {}) {
  const paper = PAPER_PRESETS[options.paper ?? state.sheet?.paper ?? '4r'] ?? PAPER_PRESETS['4r'];
  const copies = Math.max(1, Math.min(60, Number(options.copies ?? state.sheet?.copies ?? 6)));
  const spacing = Math.max(0, Number(options.spacing ?? state.sheet?.spacing ?? 22));
  const margin = paper.id === 'a4' ? 54 : 30;
  const photo = await createRenderedCanvas({ ...state, compareMode: false, guide: false });
  const page = makeCanvas(paper.widthPx, paper.heightPx);
  const ctx = page.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, page.width, page.height);
  const grid = bestSheetGrid(photo.width, photo.height, page.width, page.height, copies, margin, spacing);
  const cellWidth = (page.width - margin * 2 - spacing * (grid.columns - 1)) / grid.columns;
  const cellHeight = (page.height - margin * 2 - spacing * (grid.rows - 1)) / grid.rows;
  for (let index = 0; index < copies; index += 1) {
    const column = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    const cellX = margin + column * (cellWidth + spacing);
    const cellY = margin + row * (cellHeight + spacing);
    const fit = Math.min(1, cellWidth / photo.width, cellHeight / photo.height);
    const drawWidth = photo.width * fit;
    const drawHeight = photo.height * fit;
    const x = cellX + (cellWidth - drawWidth) / 2;
    const y = cellY + (cellHeight - drawHeight) / 2;
    ctx.drawImage(photo, x, y, drawWidth, drawHeight);
    if (options.cutLines ?? state.sheet?.cutLines) {
      const mark = Math.max(8, paper.widthPx / 180);
      const offset = 3;
      ctx.strokeStyle = '#707782';
      ctx.lineWidth = Math.max(1, paper.widthPx / 2400);
      ctx.beginPath();
      ctx.moveTo(x - mark, y - offset); ctx.lineTo(x - offset, y - offset);
      ctx.moveTo(x - offset, y - mark); ctx.lineTo(x - offset, y - offset);
      ctx.moveTo(x + drawWidth + offset, y - offset); ctx.lineTo(x + drawWidth + mark, y - offset);
      ctx.moveTo(x + drawWidth + offset, y - mark); ctx.lineTo(x + drawWidth + offset, y - offset);
      ctx.moveTo(x - mark, y + drawHeight + offset); ctx.lineTo(x - offset, y + drawHeight + offset);
      ctx.moveTo(x - offset, y + drawHeight + offset); ctx.lineTo(x - offset, y + drawHeight + mark);
      ctx.moveTo(x + drawWidth + offset, y + drawHeight + offset); ctx.lineTo(x + drawWidth + mark, y + drawHeight + offset);
      ctx.moveTo(x + drawWidth + offset, y + drawHeight + offset); ctx.lineTo(x + drawWidth + offset, y + drawHeight + mark);
      ctx.stroke();
    }
  }
  return page;
}

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, false);
}

function makePngChunk(type, data) {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  writeUint32(view, 0, data.length);
  for (let index = 0; index < 4; index += 1) chunk[4 + index] = type.charCodeAt(index);
  chunk.set(data, 8);
  writeUint32(view, 8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
}

async function addPngResolution(blob, dpi) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < 33 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) return blob;
  const pixelsPerMeter = Math.round(dpi / 0.0254);
  const data = new Uint8Array(9);
  const dataView = new DataView(data.buffer);
  writeUint32(dataView, 0, pixelsPerMeter);
  writeUint32(dataView, 4, pixelsPerMeter);
  data[8] = 1;
  const physicalChunk = makePngChunk('pHYs', data);
  const parts = [bytes.slice(0, 8)];
  let offset = 8;
  let inserted = false;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
    const end = offset + 12 + length;
    if (end > bytes.length) return blob;
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    if (type !== 'pHYs') parts.push(bytes.slice(offset, end));
    if (type === 'IHDR' && !inserted) {
      parts.push(physicalChunk);
      inserted = true;
    }
    offset = end;
    if (type === 'IEND') break;
  }
  return inserted ? new Blob(parts, { type: 'image/png' }) : blob;
}

async function addJpegResolution(blob, dpi) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return blob;
  const density = Math.max(1, Math.min(65535, Math.round(dpi)));
  let offset = 2;
  while (offset + 4 < bytes.length && bytes[offset] === 0xFF) {
    const marker = bytes[offset + 1];
    if (marker === 0xDA || marker === 0xD9) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) break;
    if (marker === 0xE0 && length >= 16 && String.fromCharCode(...bytes.slice(offset + 4, offset + 9)) === 'JFIF\0') {
      bytes[offset + 11] = 1;
      bytes[offset + 12] = (density >> 8) & 0xFF;
      bytes[offset + 13] = density & 0xFF;
      bytes[offset + 14] = (density >> 8) & 0xFF;
      bytes[offset + 15] = density & 0xFF;
      return new Blob([bytes], { type: 'image/jpeg' });
    }
    offset += 2 + length;
  }
  const segment = new Uint8Array(18);
  segment.set([0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x02, 0x01, (density >> 8) & 0xFF, density & 0xFF, (density >> 8) & 0xFF, density & 0xFF, 0x00, 0x00]);
  return new Blob([bytes.slice(0, 2), segment, bytes.slice(2)], { type: 'image/jpeg' });
}

export function downloadCanvas(canvas, filename, mimeType = 'image/png', quality = 0.96, dpi = 300) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('The browser could not create the export file.'));
        return;
      }
      try {
        let outputBlob = blob;
        if (mimeType === 'image/png') outputBlob = await addPngResolution(blob, dpi);
        if (mimeType === 'image/jpeg') outputBlob = await addJpegResolution(blob, dpi);
        const url = URL.createObjectURL(outputBlob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        resolve(outputBlob);
      } catch (error) {
        reject(error);
      }
    }, mimeType, quality);
  });
}
