import { RotateCcw, SlidersHorizontal, AlignCenter } from 'lucide-react';
import { useEditor } from '../context/EditorContext.jsx';

const CONTROLS = [
  { key: 'brightness', label: 'Brightness', min: 40, max: 160, initial: 100, suffix: '%' },
  { key: 'contrast', label: 'Contrast', min: 40, max: 160, initial: 100, suffix: '%' },
  { key: 'saturation', label: 'Saturation', min: 0, max: 180, initial: 100, suffix: '%' },
  { key: 'warmth', label: 'Warmth', min: -100, max: 100, initial: 0, suffix: '' },
  { key: 'rotation', label: 'Rotation', min: -30, max: 30, initial: 0, suffix: '°' },
  { key: 'scale', label: 'Subject scale', min: 0.5, max: 1.6, step: 0.01, initial: 1, suffix: '×' },
  { key: 'x', label: 'Horizontal position', min: -30, max: 30, initial: 0, suffix: '' },
  { key: 'y', label: 'Vertical position', min: -30, max: 30, initial: 0, suffix: '' },
];

export default function AdjustmentsPanel() {
  const { state, update } = useEditor();
  function setValue(key, value) {
    update({ adjustments: { ...state.adjustments, [key]: value } });
  }
  function reset() {
    update({ adjustments: { brightness: 100, contrast: 100, saturation: 100, warmth: 0, rotation: 0, scale: 1, x: 0, y: 0, feather: 0 } });
  }

  return (
    <section className="right-panel adjustments-panel">
      <div className="panel-title-row">
        <div><div className="eyebrow">IMAGE REFINEMENT</div><h2>Adjustments</h2></div>
        <SlidersHorizontal size={18} className="muted-icon" />
      </div>
      <div className="adjustment-toolbar"><span>Subject & color</span><button className="text-button" onClick={reset}><RotateCcw size={13} /> Reset</button></div>
      {CONTROLS.map((control) => {
        const value = state.adjustments[control.key] ?? control.initial;
        const display = control.key === 'scale' ? `${Number(value).toFixed(2)}×` : `${value}${control.suffix}`;
        return (
          <div className="adjustment-control" key={control.key}>
            <div className="range-heading"><label htmlFor={`adjust-${control.key}`}>{control.label}</label>{control.key === 'rotation' ? <button className="text-button straighten-button" onClick={() => update({ adjustments: { ...state.adjustments, rotation: 0 } })}><AlignCenter size={12} /> Straighten</button> : <output>{display}</output>}</div>
            <input id={`adjust-${control.key}`} type="range" min={control.min} max={control.max} step={control.step ?? 1} value={value} onChange={(event) => setValue(control.key, Number(event.target.value))} disabled={!state.image} />
          </div>
        );
      })}
      <div className="adjustment-tip">Tip: use the arrow keys while the canvas is focused to nudge the subject one small step.</div>
    </section>
  );
}
