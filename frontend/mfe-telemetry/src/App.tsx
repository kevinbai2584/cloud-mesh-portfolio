import TelemetryDashboard from './components/TelemetryDashboard';
export default function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f19', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <TelemetryDashboard />
      </div>
    </div>
  );
}