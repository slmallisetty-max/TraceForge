import { Routes, Route } from 'react-router-dom';
import TraceList from './components/TraceList';
import TraceDetail from './components/TraceDetail';
import TraceDiff from './components/TraceDiff';
import Dashboard from './components/Dashboard';
import ConfigEditor from './components/ConfigEditor';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<TraceList />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/config" element={<ConfigEditor />} />
              <Route path="/trace/:id" element={<TraceDetail />} />
              <Route path="/diff" element={<TraceDiff />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
