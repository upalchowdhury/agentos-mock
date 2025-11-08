import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { TraceExplorer } from './pages/TraceExplorer';
import { SequenceDiagram } from './pages/SequenceDiagram';
import { Flamegraph } from './pages/Flamegraph';
import { Catalog } from './pages/Catalog';
import { Policies } from './pages/Policies';
import { OtelPreview } from './pages/OtelPreview';
import { DemoMode } from './pages/DemoMode';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="traces" element={<TraceExplorer />} />
          <Route path="traces/:traceId" element={<TraceExplorer />} />
          <Route path="sequence" element={<SequenceDiagram />} />
          <Route path="flamegraph" element={<Flamegraph />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="policies" element={<Policies />} />
          <Route path="otel/preview" element={<OtelPreview />} />
          <Route path="demo" element={<DemoMode />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
