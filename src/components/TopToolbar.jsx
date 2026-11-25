import { useRef, useState } from 'react';
import { Download, FileImage, FolderOpen, Redo2, Undo2, ZoomIn, ZoomOut, Maximize2, Columns2, LoaderCircle } from 'lucide-react';
import { useEditor } from '../context/EditorContext.jsx';
import { readFileAsDataUrl } from '../utils/imageIO.js';
import { createRenderedCanvas, createPrintSheet, downloadCanvas } from '../utils/canvasEngine.js';

export default function TopToolbar() {
  const { state, update, undo, redo, canUndo, canRedo } = useEditor();
  const fileRef = useRef(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState('png');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const image = await readFileAsDataUrl(file);
      update({ image, cutout: null, brushStrokes: [], brushMode: 'off', compareMode: false });
    } catch (error) {
      window.alert(error.message);
    }
    event.target.value = '';
  }

  async function handleExport() {
    if (!state.image) return;
    setExporting(true);
    setExportError('');
    try {
      if (format === 'sheet') {
        const canvas = await createPrintSheet(state, state.sheet);
        await downloadCanvas(canvas, `studio-id-${state.sheet.paper}-300dpi.png`, 'image/png');
      } else {
        const canvas = await createRenderedCanvas(state);
        const isJpeg = format === 'jpg';
        if (isJpeg) {
          const whiteCanvas = document.createElement('canvas');
          whiteCanvas.width = canvas.width;
          whiteCanvas.height = canvas.height;
          const context = whiteCanvas.getContext('2d');
          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, whiteCanvas.width, whiteCanvas.height);
          context.drawImage(canvas, 0, 0);
          await downloadCanvas(whiteCanvas, `studio-id-${state.template.id}-300dpi.jpg`, 'image/jpeg', 0.98);
        } else {
          await downloadCanvas(canvas, `studio-id-${state.template.id}-300dpi.png`, 'image/png');
        }
      }
      setExportOpen(false);
    } catch (error) {
      setExportError(error.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><FileImage size={19} /></div>
          <div>
            <div className="brand-name">Studio <span>ID</span></div>
            <div className="brand-subtitle">PHOTO WORKSPACE</div>
          </div>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group primary-tools">
          <button className="tool-button upload-button" onClick={() => fileRef.current?.click()}>
            <FolderOpen size={16} /> <span>Open photo</span>
          </button>
          <input ref={fileRef} className="visually-hidden" type="file" accept="image/*" onChange={handleUpload} />
          <button className="icon-button" title="Undo · Ctrl+Z" onClick={undo} disabled={!canUndo}><Undo2 size={17} /></button>
          <button className="icon-button" title="Redo · Ctrl+Y" onClick={redo} disabled={!canRedo}><Redo2 size={17} /></button>
        </div>
        <div className="toolbar-spacer" />
        <div className="toolbar-group view-tools">
          <button className="icon-button" title="Zoom out" onClick={() => update({ zoom: Math.max(0.35, Number((state.zoom - 0.1).toFixed(2))) }, false)}><ZoomOut size={17} /></button>
          <span className="zoom-value">{Math.round(state.zoom * 100)}%</span>
          <button className="icon-button" title="Zoom in" onClick={() => update({ zoom: Math.min(2.5, Number((state.zoom + 0.1).toFixed(2))) }, false)}><ZoomIn size={17} /></button>
          <button className="icon-button" title="Fit to workspace" onClick={() => update({ zoom: 1 }, false)}><Maximize2 size={16} /></button>
          <div className="toolbar-divider short" />
          <button className={`compare-button ${state.compareMode ? 'active' : ''}`} onClick={() => update({ compareMode: !state.compareMode }, false)} disabled={!state.image || state.sheet.mode === 'sheet'}>
            <Columns2 size={16} /> <span>Compare</span>
          </button>
        </div>
        <button className="export-button" onClick={() => { setFormat(state.sheet.mode === 'sheet' ? 'sheet' : 'png'); setExportOpen(true); }} disabled={!state.image}>
          <Download size={16} /> Export
        </button>
      </header>

      {exportOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setExportOpen(false)}>
          <section className="export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">FINAL OUTPUT</div>
                <h2 id="export-title">Export your photo</h2>
              </div>
              <button className="icon-button" onClick={() => setExportOpen(false)} aria-label="Close export dialog">×</button>
            </div>
            <label className="field-label" htmlFor="export-format">File format</label>
            <select id="export-format" className="select-control" value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="png">PNG · transparent background supported</option>
              <option value="jpg">JPG · white/solid background</option>
              <option value="sheet">Print sheet · {state.sheet.paper === '4r' ? '4R' : 'A4'} PNG at 300 DPI</option>
            </select>
            <div className="export-specs">
              <div><span>Photo size</span><strong>{state.template.widthPx} × {state.template.heightPx} px</strong></div>
              <div><span>Resolution</span><strong>300 DPI canvas</strong></div>
              <div><span>Paper copies</span><strong>{state.sheet.copies} · {state.sheet.paper.toUpperCase()}</strong></div>
            </div>
            {format === 'jpg' && state.background.type === 'transparent' && <p className="inline-note">JPG does not support transparency. The exported JPG will display a white background.</p>}
            {exportError && <p className="error-text">{exportError}</p>}
            <button className="primary-button full-button" onClick={handleExport} disabled={exporting}>
              {exporting ? <><LoaderCircle className="spin" size={17} /> Preparing export…</> : <><Download size={17} /> Save export</>}
            </button>
            <p className="modal-footnote">Print at 100% / Actual size in your printer dialog for accurate physical dimensions.</p>
          </section>
        </div>
      )}
    </>
  );
}
