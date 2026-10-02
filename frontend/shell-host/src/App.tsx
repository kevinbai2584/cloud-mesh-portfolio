import { Suspense, lazy, useState, Component, type ReactNode } from 'react';

const RemoteProjectList = lazy(() => import('mfe_profile/ProjectList'));
const RemoteTelemetryDashboard = lazy(() => import('mfe_telemetry/TelemetryDashboard'));
const RemoteAgentStudio = lazy(() => import('mfe_agent/AgentStudio'));
interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackText: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class RemoteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', border: '1px dashed #ef4444', borderRadius: 10, color: '#f87171', fontFamily: 'monospace' }}>
          <div>Failed to connect to remote service.</div>
          <div style={{ fontSize: 12, marginTop: 8, color: '#94a3b8' }}>{this.props.fallbackText}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'profile' | 'telemetry' | 'agent'>('profile');

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#0b0f19', color: '#f1f5f9' }}>
      {/* Global Gateway Header */}
      <header style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a', width: '100%' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }}></span>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '0.04em', color: '#ffffff' }}>
              CLOUD MESH GATEWAY
            </span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', backgroundColor: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: 4, border: '1px solid #334155' }}>
              Host: 5000
            </span>
          </div>

          <nav style={{ display: 'flex', gap: 24, fontSize: 14 }}>
            <span
              onClick={() => setActiveTab('profile')}
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                color: activeTab === 'profile' ? '#38bdf8' : '#94a3b8',
                borderBottom: activeTab === 'profile' ? '2px solid #38bdf8' : '2px solid transparent',
                paddingBottom: 4,
              }}
            >
              Profile Showcase
            </span>
            <span
              onClick={() => setActiveTab('telemetry')}
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                color: activeTab === 'telemetry' ? '#38bdf8' : '#94a3b8',
                borderBottom: activeTab === 'telemetry' ? '2px solid #38bdf8' : '2px solid transparent',
                paddingBottom: 4,
              }}
            >
              Telemetry Metrics
            </span>
            <span
              onClick={() => setActiveTab('agent')}
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                color: activeTab === 'agent' ? '#38bdf8' : '#94a3b8',
                borderBottom: activeTab === 'agent' ? '2px solid #38bdf8' : '2px solid transparent',
                paddingBottom: 4,
              }}
            >
              Agent Studio
            </span>
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '36px 24px', width: '100%' }}>
        {activeTab === 'profile' && (
          <RemoteErrorBoundary fallbackText="Ensure mfe-profile is running on http://localhost:5001">
            <Suspense
              fallback={
                <div style={{ padding: 48, textAlign: 'center', color: '#64748b', border: '1px dashed #1e293b', borderRadius: 10, fontFamily: 'monospace' }}>
                  Resolving & mounting remote component from http://localhost:5001/assets/remoteEntry.js ...
                </div>
              }
            >
              <RemoteProjectList />
            </Suspense>
          </RemoteErrorBoundary>
        )}

        {activeTab === 'telemetry' && (
          <RemoteErrorBoundary fallbackText="Ensure mfe-telemetry is running on http://localhost:5002">
            <Suspense
              fallback={
                <div style={{ padding: 48, textAlign: 'center', color: '#64748b', border: '1px dashed #1e293b', borderRadius: 10, fontFamily: 'monospace' }}>
                  Resolving & mounting remote telemetry from http://localhost:5002/assets/remoteEntry.js ...
                </div>
              }
            >
              <RemoteTelemetryDashboard />
            </Suspense>
          </RemoteErrorBoundary>
        )}

        {activeTab === 'agent' && (
  <RemoteErrorBoundary fallbackText="Ensure mfe-agent is running on http://localhost:5003">
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b', border: '1px dashed #1e293b', borderRadius: 10, fontFamily: 'monospace' }}>
          Resolving & mounting remote agent from http://localhost:5003/assets/remoteEntry.js ...
        </div>
      }
    >
      <RemoteAgentStudio />
    </Suspense>
  </RemoteErrorBoundary>
)}
      </main>
    </div>
  );
}