import { useEffect, useRef, useState } from 'react';
import { ImagePlus, UploadCloud, Move, MousePointer2, ZoomIn } from 'lucide-react';
import { useEditor } from '../context/EditorContext.jsx';
import { createPrintSheet, renderArtwork } from '../utils/canvasEngine.js';
import { PAPER_PRESETS } from '../data/templates.js';
import { readFileAsDataUrl } from '../utils/imageIO.js';

export default function EditorCanvas() {
  const { state, update } = useEditor();
  const workspaceRef = useRef(null);
  const canvasRef = useRef(null);
  const activePointerRef = useRef(null);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 800, height: 620 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeStroke, setActiveStroke] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const renderVersion = useRef(0);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setWorkspaceSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!state.image || !canvasRef.current) return undefined;
    const version = ++renderVersion.current;
    const visibleState = activeStroke ? { ...state, brushStrokes: [...state.brushStrokes, activeStroke] } : state;
    const draw = async () => {
      const rendered = visibleState.sheet?.mode === 'sheet'
        ? await createPrintSheet(visibleState, visibleState.sheet)
        : await renderArtwork(visibleState, document.createElement('canvas'));
      if (version !== renderVersion.current || !canvasRef.current) return;
      const visibleCanvas = canvasRef.current;
      visibleCanvas.width = rendered.width;
      visibleCanvas.height = rendered.height;
      const context = visibleCanvas.getContext('2d');
      context.clearRect(0, 0, rendered.width, rendered.height);
      context.drawImage(rendered, 0, 0);
    };
    draw().catch((error) => console.error('Canvas render failed:', error));
    return () => { renderVersion.current += 1; };
  }, [state, activeStroke]);

  const previewSize = state.sheet?.mode === 'sheet' ? PAPER_PRESETS[state.sheet.paper] : state.template;
  const baseScale = Math.min((workspaceSize.width * 0.74) / previewSize.widthPx, (workspaceSize.height * 0.82) / previewSize.heightPx, 1.2);
  const displayWidth = Math.max(1, previewSize.widthPx * baseScale * state.zoom);
  const displayHeight = Math.max(1, previewSize.heightPx * baseScale * state.zoom);

  function pointFromEvent(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(event) {
    if (!state.image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    if (state.sheet?.mode !== 'sheet' && state.brushMode !== 'off' && state.cutout) {
      activePointerRef.current = { type: 'brush', pointerId: event.pointerId };
      setActiveStroke({ mode: state.brushMode, radius: state.brushSize / Math.max(1, displayWidth), hardness: state.brushHardness, points: [point] });
    } else {
      activePointerRef.current = { type: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y };
    }
  }

  function handlePointerMove(event) {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (active.type === 'brush') {
      const point = pointFromEvent(event);
      setActiveStroke((current) => current ? { ...current, points: [...current.points, point] } : current);
    } else {
      setPan({ x: active.panX + event.clientX - active.startX, y: active.panY + event.clientY - active.startY });
    }
  }

  function finishPointer(event) {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (active.type === 'brush' && activeStroke) {
      update({ brushStrokes: [...state.brushStrokes, activeStroke] });
    }
    setActiveStroke(null);
    activePointerRef.current = null;
  }

  function handleWheel(event) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    update({ zoom: Math.max(0.35, Math.min(2.5, Number((state.zoom + delta).toFixed(2)))) }, false);
  }

  function handleKeyDown(event) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 2 : 0.5;
    const x = state.adjustments.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0);
    const y = state.adjustments.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0);
    update({ adjustments: { ...state.adjustments, x, y } }, false);
  }

  async function acceptDroppedFile(file) {
    try {
      const image = await readFileAsDataUrl(file);
      update({ image, cutout: null, brushStrokes: [], brushMode: 'off', compareMode: false });
    } catch (error) {
      window.alert(error.message);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) acceptDroppedFile(file);
  }

  return (
    <section className="editor-workspace" ref={workspaceRef} onWheel={handleWheel} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      <div className="workspace-topline">
        <div className="canvas-breadcrumb"><span>Workspace</span><i>/</i><strong>{state.template.name}</strong></div>
        {state.image && <div className="canvas-meta"><span>{state.sheet?.mode === 'sheet' ? `${previewSize.widthPx} × ${previewSize.heightPx} px · ${state.sheet.paper.toUpperCase()} sheet` : `${state.template.widthPx} × ${state.template.heightPx} px`}</span><span className="meta-dot" /> <span>300 DPI</span></div>}
      </div>
      {state.image ? (
        <div className="canvas-stage-wrap">
          <div className="canvas-stage" style={{ width: displayWidth, height: displayHeight, transform: `translate(${pan.x}px, ${pan.y}px)` }}>
            <canvas
              ref={canvasRef}
              className={`editor-canvas ${state.sheet?.mode !== 'sheet' && state.brushMode !== 'off' && state.cutout ? 'brush-cursor' : 'pan-cursor'}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointer}
              onPointerCancel={finishPointer}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              aria-label="Photo editing canvas. Use arrow keys to nudge the subject."
            />
          </div>
        </div>
      ) : (
        <div className={`empty-state ${dragOver ? 'drag-over' : ''}`}>
          <div className="empty-icon"><UploadCloud size={28} /></div>
          <h2>Start with a portrait</h2>
          <p>Upload an image to create an ID photo, passport picture, or custom print sheet.</p>
          <label className="primary-button empty-upload"><ImagePlus size={16} /> Choose photo<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && acceptDroppedFile(event.target.files[0])} /></label>
          <span className="drop-hint">or drag and drop an image here</span>
          <div className="supported-types">JPG · PNG · WEBP</div>
        </div>
      )}
      <div className="workspace-bottomline">
        <div className="canvas-hint">{state.sheet?.mode !== 'sheet' && state.brushMode !== 'off' && state.cutout ? <><MousePointer2 size={13} /> Paint on the photo to {state.brushMode} pixels</> : <><Move size={13} /> {state.sheet?.mode === 'sheet' ? 'Print sheet preview' : 'Drag to pan'} · Scroll to zoom · <ZoomIn size={13} /> {Math.round(state.zoom * 100)}%</>}</div>
        {state.image && <div className="canvas-state-pill"><span /> {state.sheet?.mode === 'sheet' ? `${state.sheet.copies} print copies` : state.cutout ? 'AI cutout active' : 'Original photo'}</div>}
      </div>
      {dragOver && <div className="drop-overlay"><UploadCloud size={30} /><strong>Drop image to open</strong></div>}
    </section>
  );
}
