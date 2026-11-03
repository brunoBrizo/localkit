import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { runTool, tools } from './tools';
import './styles.css';

function App() {
  const [toolId, setToolId] = useState(tools[0].id);
  const [input, setInput] = useState('');
  const tool = tools.find((t) => t.id === toolId) ?? tools[0];
  const { output, error } = input ? runTool(tool, input) : { output: '' };

  return (
    <div className="app">
      <nav aria-label="Tools">
        {tools.map((t) => (
          <button key={t.id} aria-pressed={t.id === toolId} onClick={() => setToolId(t.id)}>
            {t.name}
          </button>
        ))}
      </nav>
      <main>
        <label>
          Input
          <textarea value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} autoFocus />
        </label>
        <label>
          Output
          <textarea value={error ?? output} readOnly className={error ? 'error' : undefined} spellCheck={false} />
        </label>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
