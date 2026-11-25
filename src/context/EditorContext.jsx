import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { getTemplate } from '../data/templates.js';

const EditorContext = createContext(null);

const initialState = {
  image: null,
  cutout: null,
  background: { type: 'transparent', color: '#FFFFFF', image: null, scale: 1, x: 0, y: 0, blur: 0 },
  template: getTemplate('bd-35x45'),
  adjustments: { brightness: 100, contrast: 100, saturation: 100, warmth: 0, rotation: 0, scale: 1, x: 0, y: 0, feather: 0 },
  brushMode: 'off',
  brushSize: 34,
  brushHardness: 82,
  brushStrokes: [],
  guide: false,
  compareMode: false,
  sheet: { mode: 'single', paper: '4r', copies: 6, spacing: 22, cutLines: true },
  zoom: 1,
};

function reducer(history, action) {
  switch (action.type) {
    case 'UPDATE': {
      const nextState = { ...history.present, ...action.patch };
      const past = action.record === false ? history.past : [...history.past, history.present].slice(-60);
      return { past, present: nextState, future: action.record === false ? history.future : [] };
    }
    case 'UNDO': {
      if (!history.past.length) return history;
      const previous = history.past[history.past.length - 1];
      return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
    }
    case 'REDO': {
      if (!history.future.length) return history;
      const [next, ...future] = history.future;
      return { past: [...history.past, history.present].slice(-60), present: next, future };
    }
    case 'RESET':
      return { past: [], present: { ...initialState }, future: [] };
    default:
      return history;
  }
}

export function EditorProvider({ children }) {
  const [history, dispatch] = useReducer(reducer, { past: [], present: initialState, future: [] });
  const update = useCallback((patch, record = true) => dispatch({ type: 'UPDATE', patch, record }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const value = useMemo(() => ({
    state: history.present,
    update,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }), [history, update, undo, redo, reset]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used inside EditorProvider');
  return context;
}
