import { Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ModList } from './components/ModList';
import { ServerList } from './components/ServerList';
import { ServerDetail } from './components/ServerDetail';
import { ModDetail } from './components/ModDetail';
import { TrendingPage } from './components/TrendingPage';
import { SupportPage } from './components/SupportPage';
import { ReforgerHosting } from './components/ReforgerHosting';
import { Arma3Hosting } from './components/Arma3Hosting';
import { StatusPage } from './components/StatusPage';
import { ConfigAuditPage } from './components/ConfigAuditPage';
import { StoragePlannerPage } from './components/StoragePlannerPage';
import { StoragePlannerLanding } from './components/StoragePlannerLanding';
import { ScenarioList } from './components/ScenarioList';
import { Layout } from './components/Layout';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-red-500 p-20 font-mono">
          <h1 className="text-4xl font-black mb-8">// SYSTEM_CRITICAL_FAILURE</h1>
          <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-lg mb-8">
            <p className="font-bold mb-4">Error Details:</p>
            <pre className="text-xs bg-black/40 p-4 border border-white/5 overflow-auto max-h-[400px]">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-red-600 text-white font-black hover:bg-white hover:text-black transition-all"
          >
            REBOOT SYSTEM (RELOAD)
          </button>
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
          <Routes>
            {/* Reforger routes (default) */}
            <Route path="/" element={<ModList game="reforger" />} />
            <Route path="/servers" element={<ServerList game="reforger" />} />
            <Route path="/server/:serverId" element={<ServerDetail game="reforger" />} />
            <Route path="/mod/:modId" element={<ModDetail game="reforger" />} />
            <Route path="/trending" element={<TrendingPage game="reforger" />} />
            <Route path="/scenarios" element={<ScenarioList game="reforger" />} />
            <Route path="/hosting" element={<ReforgerHosting />} />
            <Route path="/status" element={<StatusPage game="reforger" />} />
            <Route path="/audit" element={<ConfigAuditPage game="reforger" />} />
            <Route path="/storage-planner" element={<StoragePlannerPage game="reforger" />} />
            <Route path="/arma-reforger-console-mod-storage" element={<StoragePlannerLanding />} />
            <Route path="/support" element={<SupportPage />} />

            {/* Arma 3 routes */}
            <Route path="/arma3" element={<ModList game="arma3" />} />
            <Route path="/arma3/servers" element={<ServerList game="arma3" />} />
            <Route path="/arma3/server/:serverId" element={<ServerDetail game="arma3" />} />
            <Route path="/arma3/mod/:modId" element={<ModDetail game="arma3" />} />
            <Route path="/arma3/trending" element={<TrendingPage game="arma3" />} />
            <Route path="/arma3/scenarios" element={<ScenarioList game="arma3" />} />
            <Route path="/arma3/hosting" element={<Arma3Hosting />} />
            <Route path="/arma3/status" element={<StatusPage game="arma3" />} />
            <Route path="/best-arma-reforger-hosting" element={<ReforgerHosting />} />
            <Route path="/best-arma-3-hosting" element={<Arma3Hosting />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
