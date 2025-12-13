import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-blue-500">TraceForge</span>
            <span className="text-sm text-gray-400">AI Debugging</span>
          </Link>
          <nav className="flex space-x-4">
            <Link
              to="/dashboard"
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700"
            >
              📊 Dashboard
            </Link>
            <Link
              to="/"
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700"
            >
              📝 Traces
            </Link>
            <Link
              to="/config"
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700"
            >
              ⚙️ Config
            </Link>
            <a
              href="https://github.com/traceforge/traceforge"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700"
            >
              📚 Docs
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
