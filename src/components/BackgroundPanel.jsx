import { useRef, useState } from 'react';
import { ImagePlus, Eraser, RotateCcw, Sparkles, WandSparkles, CheckCircle2, LoaderCircle, Layers, Paintbrush } from 'lucide-react';
import { useEditor } from '../context/EditorContext.jsx';
import { removeImageBackground } from '../utils/bgRemover.js';
import { readFileAsDataUrl } from '../utils/imageIO.js';

const SWATCHES = [
  { name: 'White', color: '#FFFFFF' },
  { name: 'Passport blue', color: '#76BCE8' },
  { name: 'Light gray', color: '#E8EAED' },
  { name: 'Red', color: '#C9343C' },
];

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the processed image.'));
    reader.readAsDataURL(blob);
  });
}

export default function BackgroundPanel() {
  const { state, update } = useEditor();
  const backgroundFileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, message: '' });
  const [error, setError] = useState('');
  const hasPhoto = Boolean(state.image);
  const background = state.background;

  async function handleRemove() {
    if (!hasPhoto || busy) return;
    setBusy(true);
    setError('');
    setProgress({ percent: 2, message: 'Starting AI engine…' });
    try {
      const result = await removeImageBackground(state.image, setProgress);
      const cutout = await blobToDataUrl(result);
      update({ cutout, brushStrokes: [], background: { ...state.background, type: 'transparent' }, compareMode: false });
    } catch (problem) {
      setError(problem?.message || 'Background removal did not complete. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function setSolid(color) {
    if (!hasPhoto) {
      update({ background: { ...background, type: 'solid', color } });
      return;
    }
    if (state.cutout) {
      update({ background: { ...background, type: 'solid', color } });
      return;
    }
    if (busy) return;
    setBusy(true);
    setError('');
    setProgress({ percent: 2, message: 'Isolating the subject for the new background…' });
    try {
      const result = await removeImageBackground(state.image, setProgress);
      const cutout = await blobToDataUrl(result);
      update({ cutout, brushStrokes: [], background: { ...background, type: 'solid', color }, compareMode: false });
    } catch (problem) {
      setError(problem?.message || 'The background could not be replaced. Try removing the background first.');
    } finally {
      setBusy(false);
    }
  }

  async function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const image = await readFileAsDataUrl(file);
      if (hasPhoto && !state.cutout) {
        setBusy(true);
        setError('');
        setProgress({ percent: 2, message: 'Isolating the subject for your background photo…' });
        const result = await removeImageBackground(state.image, setProgress);
        const cutout = await blobToDataUrl(result);
        update({ cutout, brushStrokes: [], background: { ...background, type: 'image', image, scale: 1, x: 0, y: 0, blur: 0 }, compareMode: false });
      } else {
        update({ background: { ...background, type: 'image', image, scale: 1, x: 0, y: 0, blur: 0 } });
      }
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  function updateBackground(patch) {
    update({ background: { ...background, ...patch } });
  }

  function updateAdjustments(patch) {
    update({ adjustments: { ...state.adjustments, ...patch } });
  }

  return (
    <section className="right-panel background-panel">
      <div className="panel-title-row">
        <div><div className="eyebrow">CUTOUT & COMPOSITE</div><h2>Background studio</h2></div>
        <div className="panel-title-icon"><Layers size={17} /></div>
      </div>

      <div className="remove-card">
        <div className="remove-card-top">
          <div className="ai-icon"><WandSparkles size={18} /></div>
          <div><strong>AI background removal</strong><small>Browser-based subject isolation</small></div>
        </div>
        <button className="primary-button full-button" onClick={handleRemove} disabled={!hasPhoto || busy}>
          {busy ? <><LoaderCircle className="spin" size={16} /> Processing photo…</> : <><Sparkles size={16} /> Remove background</>}
        </button>
        {busy && (
          <div className="progress-area">
            <div className="progress-meta"><span>{progress.message}</span><b>{progress.percent}%</b></div>
            <div className="progress-track"><i style={{ width: `${progress.percent}%` }} /></div>
            <small>First run downloads the AI model assets; later runs can use the browser cache.</small>
          </div>
        )}
        {state.cutout && !busy && <div className="success-hint"><CheckCircle2 size={14} /> Transparent cutout is ready for editing</div>}
        {error && <p className="error-text">{error}</p>}
        {!hasPhoto && <p className="helper-text">Open a photo to enable background removal.</p>}
      </div>

      <div className="subsection-heading"><Paintbrush size={15} /><span>Manual edge touch-up</span></div>
      <div className="brush-mode-row">
        <button className={state.brushMode === 'off' ? 'active' : ''} onClick={() => update({ brushMode: 'off' })}>Off</button>
        <button className={state.brushMode === 'erase' ? 'active' : ''} onClick={() => update({ brushMode: 'erase', compareMode: false })} disabled={!state.cutout}><Eraser size={13} /> Erase</button>
        <button className={state.brushMode === 'restore' ? 'active' : ''} onClick={() => update({ brushMode: 'restore', compareMode: false })} disabled={!state.cutout}><RotateCcw size={13} /> Restore</button>
      </div>
      <div className="range-row">
        <label htmlFor="brush-size">Brush size</label><strong>{state.brushSize}px</strong>
        <input id="brush-size" type="range" min="8" max="100" value={state.brushSize} onChange={(event) => update({ brushSize: Number(event.target.value) }, false)} disabled={!state.cutout} />
      </div>
      <div className="range-row">
        <label htmlFor="brush-hardness">Brush hardness</label><strong>{state.brushHardness}%</strong>
        <input id="brush-hardness" type="range" min="20" max="100" value={state.brushHardness} onChange={(event) => update({ brushHardness: Number(event.target.value) }, false)} disabled={!state.cutout} />
      </div>
      <div className="range-row">
        <label htmlFor="edge-feather">Edge softness</label><strong>{state.adjustments.feather}px</strong>
        <input id="edge-feather" type="range" min="0" max="24" value={state.adjustments.feather} onChange={(event) => updateAdjustments({ feather: Number(event.target.value) })} disabled={!state.cutout} />
      </div>
      <button className="text-button clear-brush" onClick={() => update({ brushStrokes: [] })} disabled={!state.brushStrokes.length}>Clear brush edits</button>

      <div className="section-divider" />
      <div className="subsection-heading"><span className="color-dot" /><span>Background color</span></div>
      <button className={`white-background-button ${background.type === 'solid' && background.color.toUpperCase() === '#FFFFFF' ? 'selected' : ''}`} onClick={() => setSolid('#FFFFFF')} disabled={!hasPhoto || busy}>
        <span className="white-preview" /> <span><strong>Add white background</strong><small>Pure white · #FFFFFF</small></span><CheckCircle2 size={16} />
      </button>
      <div className="swatch-grid">
        {SWATCHES.map((swatch) => (
          <button key={swatch.color} className={`swatch-option ${background.type === 'solid' && background.color.toUpperCase() === swatch.color ? 'active' : ''}`} onClick={() => setSolid(swatch.color)} title={swatch.name} disabled={!hasPhoto || busy}>
            <span style={{ background: swatch.color }} /><small>{swatch.name}</small>
          </button>
        ))}
      </div>
      <div className="custom-color-row">
        <label htmlFor="custom-color">Custom color</label>
        <input id="custom-color" type="color" value={background.color || '#FFFFFF'} onChange={(event) => setSolid(event.target.value)} disabled={!hasPhoto || busy} />
        <code>{background.color || '#FFFFFF'}</code>
      </div>
      <button className={`transparent-button ${background.type === 'transparent' ? 'selected' : ''}`} onClick={() => updateBackground({ type: 'transparent' })}>
        <span className="checker-swatch" /> Transparent canvas
      </button>

      <div className="section-divider" />
      <div className="subsection-heading"><ImagePlus size={15} /><span>Picture in background</span></div>
      <input ref={backgroundFileRef} className="visually-hidden" type="file" accept="image/*" onChange={handleBackgroundUpload} />
      <button className="secondary-button full-button" onClick={() => backgroundFileRef.current?.click()}><ImagePlus size={15} /> Add picture in background</button>
      {background.type === 'image' && background.image && (
        <>
          <div className="background-image-preview"><img src={background.image} alt="Custom background preview" /><button onClick={() => updateBackground({ type: 'transparent', image: null })}>Remove</button></div>
          <div className="range-row"><label htmlFor="bg-scale">Background scale</label><strong>{background.scale.toFixed(2)}×</strong><input id="bg-scale" type="range" min="0.5" max="2.5" step="0.05" value={background.scale} onChange={(event) => updateBackground({ scale: Number(event.target.value) })} /></div>
          <div className="range-row"><label htmlFor="bg-x">Horizontal position</label><strong>{background.x}</strong><input id="bg-x" type="range" min="-50" max="50" value={background.x} onChange={(event) => updateBackground({ x: Number(event.target.value) })} /></div>
          <div className="range-row"><label htmlFor="bg-y">Vertical position</label><strong>{background.y}</strong><input id="bg-y" type="range" min="-50" max="50" value={background.y} onChange={(event) => updateBackground({ y: Number(event.target.value) })} /></div>
          <div className="range-row"><label htmlFor="bg-blur">Background blur</label><strong>{background.blur}px</strong><input id="bg-blur" type="range" min="0" max="18" value={background.blur} onChange={(event) => updateBackground({ blur: Number(event.target.value) })} /></div>
        </>
      )}
      <p className="panel-footnote">AI processing runs on your device after the model assets are loaded. Your image is not uploaded to an application server.</p>
    </section>
  );
}
