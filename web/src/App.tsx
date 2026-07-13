import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ModList } from './components/ModList';
import { ServerList } from './components/ServerList';
import { TrendingPage } from './components/TrendingPage';
import { SupportPage } from './components/SupportPage';
import { ReforgerHosting } from './components/ReforgerHosting';
import { Arma3Hosting } from './components/Arma3Hosting';
import { StatusPage } from './components/StatusPage';
import { ScenarioList } from './components/ScenarioList';
import { Layout } from './components/Layout';
import { StatusState } from './components/ui/StatusState';

const ServerDetail = lazy(() =>
  import('./components/ServerDetail').then((m) => ({ default: m.ServerDetail }))
);
const ServerSearchLanding = lazy(() =>
  import('./components/ServerSearchLanding').then((m) => ({ default: m.ServerSearchLanding }))
);
const AdminPage = lazy(() =>
  import('./components/AdminPage').then((m) => ({ default: m.AdminPage }))
);
const ModDetail = lazy(() =>
  import('./components/ModDetail').then((m) => ({ default: m.ModDetail }))
);
const ConfigAuditPage = lazy(() =>
  import('./components/ConfigAuditPage').then((m) => ({ default: m.ConfigAuditPage }))
);
const DependencyBlockersPage = lazy(() =>
  import('./components/DependencyBlockersPage').then((m) => ({ default: m.DependencyBlockersPage }))
);
const StoragePlannerPage = lazy(() =>
  import('./components/StoragePlannerPage').then((m) => ({ default: m.StoragePlannerPage }))
);
const StoragePlannerLanding = lazy(() =>
  import('./components/StoragePlannerLanding').then((m) => ({ default: m.StoragePlannerLanding }))
);
const OfficialScenariosPage = lazy(() =>
  import('./components/OfficialScenariosPage').then((m) => ({ default: m.OfficialScenariosPage }))
);

function RouteFallback() {
  return <StatusState type="loading" />;
}

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_ERROR_PATTERNS = [
  'error loading dynamically imported module',
  'Loading chunk',
  'ChunkLoadError',
  'Loading CSS chunk',
];

function isChunkError(error: Error): boolean {
  return CHUNK_ERROR_PATTERNS.some((p) => error.message?.includes(p));
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    if (isChunkError(error)) {
      console.log('🔄 Chunk load error detected — reloading for fresh bundle');
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  public render() {
    if (this.state.hasError) {
      const isChunk = this.state.error ? isChunkError(this.state.error) : false;
      return (
        <div className="min-h-screen bg-[#101923] text-signal-critical p-20 font-mono">
          <h1 className="text-4xl font-black mb-8">// SYSTEM_CRITICAL_FAILURE</h1>
          <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-lg mb-8">
            <p className="font-bold mb-4">Error Details:</p>
            <pre className="text-xs bg-black/40 p-4 border border-white/5 overflow-auto max-h-[400px]">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
          </div>
          {isChunk ? (
            <p className="text-signal-ok font-mono text-sm mb-4 animate-pulse">
              ▸ New version detected — reloading...
            </p>
          ) : (
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-red-600 text-white font-black hover:bg-white hover:text-black transition-all"
            >
              REBOOT SYSTEM (RELOAD)
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Reforger routes (default) */}
              <Route path="/" element={<ModList game="reforger" />} />
              <Route path="/servers" element={<ServerList game="reforger" />} />
              <Route path="/server/:serverId" element={<ServerDetail game="reforger" />} />
              <Route path="/mod/:modId" element={<ModDetail game="reforger" />} />
              <Route path="/trending" element={<TrendingPage game="reforger" />} />
              <Route path="/scenarios" element={<ScenarioList game="reforger" />} />
              <Route path="/scenarios/official" element={<OfficialScenariosPage game="reforger" />} />
              <Route path="/scenarios/official/:slug" element={<OfficialScenariosPage game="reforger" />} />
              <Route path="/hosting" element={<ReforgerHosting />} />
              <Route path="/status" element={<StatusPage game="reforger" />} />
              <Route path="/audit" element={<ConfigAuditPage game="reforger" />} />
              <Route path="/dependency-blockers" element={<DependencyBlockersPage game="reforger" />} />
              <Route path="/storage-planner" element={<StoragePlannerPage game="reforger" />} />
              <Route path="/arma-reforger-console-mod-storage" element={<StoragePlannerLanding />} />
              <Route path="/arma-server-browser" element={<ServerSearchLanding />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/support" element={<SupportPage />} />

              {/* Arma 3 routes */}
              <Route path="/arma3" element={<ModList game="arma3" />} />
              <Route path="/arma3/servers" element={<ServerList game="arma3" />} />
              <Route path="/arma3/server/:serverId" element={<ServerDetail game="arma3" />} />
              <Route path="/arma3/mod/:modId" element={<ModDetail game="arma3" />} />
              <Route path="/arma3/trending" element={<TrendingPage game="arma3" />} />
              <Route path="/arma3/scenarios" element={<ScenarioList game="arma3" />} />
              <Route path="/arma3/scenarios/official" element={<OfficialScenariosPage game="arma3" />} />
              <Route path="/arma3/scenarios/official/:slug" element={<OfficialScenariosPage game="arma3" />} />
              <Route path="/arma3/hosting" element={<Arma3Hosting />} />
              <Route path="/arma3/status" element={<StatusPage game="arma3" />} />
              <Route path="/best-arma-reforger-hosting" element={<ReforgerHosting />} />
              <Route path="/best-arma-3-hosting" element={<Arma3Hosting />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
