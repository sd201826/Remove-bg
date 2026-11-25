import { useState } from 'react';
import { Check, Crop, Grid3X3, Ruler, UserRound, Printer } from 'lucide-react';
import { TEMPLATE_PRESETS, createCustomTemplate } from '../data/templates.js';
import { useEditor } from '../context/EditorContext.jsx';

export default function TemplateSidebar() {
  const { state, update } = useEditor();
  const [unit, setUnit] = useState('mm');
  const [customWidth, setCustomWidth] = useState('35');
  const [customHeight, setCustomHeight] = useState('45');
  const [customError, setCustomError] = useState('');

  function applyPreset(template) {
    update({ template, brushStrokes: [] });
  }

  function applyCustom() {
    const width = Number(customWidth);
    const height = Number(customHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 1000 || height > 1000) {
      setCustomError('Enter a width and height greater than 0 and no more than 1000.');
      return;
    }
    const template = createCustomTemplate(width, height, unit);
    if (template.widthPx > 6000 || template.heightPx > 6000) {
      setCustomError('Custom dimensions are too large for a browser canvas.');
      return;
    }
    setCustomError('');
    update({ template, brushStrokes: [] });
  }

  function updateSheet(patch) {
    update({ sheet: { ...state.sheet, ...patch } });
  }

  return (
    <aside className="left-sidebar panel-scroll">
      <div className="panel-title-row">
        <div><div className="eyebrow">DOCUMENT SETUP</div><h2>Photo templates</h2></div>
        <Crop size={18} className="muted-icon" />
      </div>
      <div className="template-group-label">PASSPORT & VISA</div>
      {TEMPLATE_PRESETS.filter((item) => item.category === 'Passport').map((item) => (
        <button className={`template-card ${state.template.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => applyPreset(item)}>
          <div className="template-preview squareish"><span /></div>
          <div className="template-copy"><strong>{item.name}</strong><small>{item.widthPx} × {item.heightPx} px</small></div>
          {state.template.id === item.id && <Check size={16} className="selected-check" />}
        </button>
      ))}
      <div className="template-group-label spaced-label">IDENTITY CARDS</div>
      {TEMPLATE_PRESETS.filter((item) => item.category === 'Identity').map((item) => (
        <button className={`template-card ${state.template.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => applyPreset(item)}>
          <div className="template-preview portrait"><span /></div>
          <div className="template-copy"><strong>{item.name}</strong><small>{item.widthPx} × {item.heightPx} px</small></div>
          {state.template.id === item.id && <Check size={16} className="selected-check" />}
        </button>
      ))}

      <div className="section-divider" />
      <div className="subsection-heading"><Ruler size={15} /><span>Custom dimensions</span></div>
      <div className="unit-toggle" role="group" aria-label="Measurement unit">
        {[['mm', 'mm'], ['in', 'in'], ['px', 'px']].map(([value, label]) => <button key={value} className={unit === value ? 'active' : ''} onClick={() => setUnit(value)}>{label}</button>)}
      </div>
      <div className="dimension-row">
        <label>Width<input className="number-input" type="number" min="1" max="1000" value={customWidth} onChange={(event) => setCustomWidth(event.target.value)} /></label>
        <label>Height<input className="number-input" type="number" min="1" max="1000" value={customHeight} onChange={(event) => setCustomHeight(event.target.value)} /></label>
      </div>
      <button className="secondary-button full-button" onClick={applyCustom}>Apply custom size</button>
      {customError && <p className="error-text compact-error">{customError}</p>}

      <div className="section-divider" />
      <div className="subsection-heading"><UserRound size={15} /><span>Alignment guide</span></div>
      <button className={`toggle-row ${state.guide ? 'toggle-on' : ''}`} onClick={() => update({ guide: !state.guide })}>
        <span><strong>Head & shoulder guide</strong><small>Eye line and chin reference</small></span>
        <span className="switch"><i /></span>
      </button>

      <div className="section-divider" />
      <div className="subsection-heading"><Printer size={15} /><span>Print layout</span></div>
      <div className="mode-switch">
        <button className={state.sheet.mode !== 'sheet' ? 'active' : ''} onClick={() => updateSheet({ mode: 'single' })}>Single photo</button>
        <button className={state.sheet.mode === 'sheet' ? 'active' : ''} onClick={() => { updateSheet({ mode: 'sheet' }); update({ compareMode: false }, false); }}><Grid3X3 size={13} /> Multi-copy</button>
      </div>
      <div className="field-stack">
        <label className="field-label" htmlFor="paper-size">Paper size</label>
        <select id="paper-size" className="select-control compact-select" value={state.sheet.paper} onChange={(event) => updateSheet({ paper: event.target.value })}>
          <option value="4r">4R · 4 × 6 in</option><option value="a4">A4 · 210 × 297 mm</option>
        </select>
        <label className="field-label" htmlFor="copy-count">Number of copies <strong className="value-inline">{state.sheet.copies}</strong></label>
        <input id="copy-count" type="range" min="1" max="24" value={state.sheet.copies} onChange={(event) => updateSheet({ copies: Number(event.target.value) })} />
        <label className="field-label" htmlFor="sheet-spacing">Spacing <strong className="value-inline">{state.sheet.spacing} px</strong></label>
        <input id="sheet-spacing" type="range" min="0" max="60" value={state.sheet.spacing} onChange={(event) => updateSheet({ spacing: Number(event.target.value) })} />
        <label className="check-row"><input type="checkbox" checked={state.sheet.cutLines} onChange={(event) => updateSheet({ cutLines: event.target.checked })} /> <span>Show printer cut lines</span></label>
      </div>
      <div className="sidebar-footer-note">Current canvas: <b>{state.template.widthPx} × {state.template.heightPx} px</b><br />300 DPI · {state.template.widthMm.toFixed(1)} × {state.template.heightMm.toFixed(1)} mm</div>
    </aside>
  );
}
