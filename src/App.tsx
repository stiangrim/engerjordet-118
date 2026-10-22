import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AccessProvider } from './access/AccessContext'
import { AccessGate } from './components/AccessGate'
import { AuthenticatedShell } from './components/AuthenticatedShell'
import { BudgetPage } from './pages/Budget'
import { OverviewPage } from './pages/Overview'
import { PlanPage } from './pages/Plan'
import { CostsPage } from './pages/Receipts'
import { PhotosPage } from './pages/Photos'

function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return undefined
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function App() {
  return (
    <AccessProvider>
      <AccessGate>
        <BrowserRouter basename={routerBasename()}>
          <Routes>
            <Route element={<AuthenticatedShell />}>
                <Route index element={<OverviewPage />} />
                <Route path="budsjett" element={<BudgetPage />} />
                <Route path="plan" element={<PlanPage />} />
                <Route path="kostnader" element={<CostsPage />} />
                <Route path="bilder" element={<PhotosPage />} />
                <Route
                  path="kvitteringer"
                  element={<Navigate to="/kostnader" replace />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
          </Routes>
        </BrowserRouter>
      </AccessGate>
    </AccessProvider>
  )
}

export default App
