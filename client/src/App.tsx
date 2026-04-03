import { WebWorkersSection } from '@components/WebWorkersSection';
import { WebAssemblySection } from '@components/WebAssemblySection';
import { IndexedDBSection } from '@components/IndexedDBSection';
import { SharedArrayBufferSection } from '@components/SharedArrayBufferSection';
import { FeaturesSection } from '@components/FeaturesSection';
import './App.scss';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>High-Performance Template</h1>
        <p className="subtitle">Vite + React + WebAssembly + Workers</p>
      </header>

      <main className="app-main">
        <WebWorkersSection />
        <WebAssemblySection />
        <IndexedDBSection />
        <SharedArrayBufferSection />
        <FeaturesSection />
      </main>

      <footer className="app-footer">
        <p>Built with performance in mind</p>
      </footer>
    </div>
  );
}

export default App;
