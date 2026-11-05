import { EmissionsTracker } from './components/EmissionsTracker';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-lg text-white">
            🌱
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight">EcoTrack</p>
            <p className="text-xs text-slate-500">Monitoreo de huella de carbono</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <EmissionsTracker />
      </main>
    </div>
  );
}
