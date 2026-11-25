import { useEffect, useState } from 'react';
import { SunMoon, SlidersHorizontal, WandSparkles } from 'lucide-react';
import { useEditor } from './context/EditorContext.jsx';
import TopToolbar from './components/TopToolbar.jsx';
import TemplateSidebar from './components/TemplateSidebar.jsx';
import BackgroundPanel from './components/BackgroundPanel.jsx';
import AdjustmentsPanel from './components/AdjustmentsPanel.jsx';
import EditorCanvas from './components/EditorCanvas.jsx';
import StatusBar from './components/StatusBar.jsx';

export default function App() {
  const { undo, redo } = useEditor();
  const [rightTab, setRightTab] = useState('background');
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    function handleShortcuts(event) {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      if (isTyping) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault(); undo();
      } else if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z')) {
        event.preventDefault(); redo();
      }
    }
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [undo, redo]);

  return (
    <div className={`app-shell ${lightMode ? 'light-mode' : ''}`}>
      <TopToolbar />
      <div className="studio-layout">
        <TemplateSidebar />
        <main className="center-column">
          <EditorCanvas />
        </main>
        <aside className="right-sidebar">
          <div className="right-tabs">
            <button className={rightTab === 'background' ? 'active' : ''} onClick={() => setRightTab('background')}><WandSparkles size={14} /> Background</button>
            <button className={rightTab === 'adjustments' ? 'active' : ''} onClick={() => setRightTab('adjustments')}><SlidersHorizontal size={14} /> Adjust</button>
            <button className="theme-switch" title="Toggle workspace appearance" onClick={() => setLightMode((value) => !value)}><SunMoon size={15} /></button>
          </div>
          <div className="right-panel-content panel-scroll">
            {rightTab === 'background' ? <BackgroundPanel /> : <AdjustmentsPanel />}
          </div>
        </aside>
      </div>
      <StatusBar />
    </div>
  );
}
