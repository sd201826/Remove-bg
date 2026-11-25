import { ShieldCheck, CircleHelp, Image as ImageIcon } from 'lucide-react';
import { useEditor } from '../context/EditorContext.jsx';

export default function StatusBar() {
  const { state } = useEditor();
  return (
    <footer className="statusbar">
      <div className="status-left"><span className="status-led" /> All changes in this session are local</div>
      <div className="status-right"><span><ImageIcon size={13} /> {state.image ? '1 image loaded' : 'No image loaded'}</span><span><ShieldCheck size={13} /> Browser-side editing</span><span><CircleHelp size={13} /> 300 DPI output</span></div>
    </footer>
  );
}
