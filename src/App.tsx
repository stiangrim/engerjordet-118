import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AccessProvider } from './access/AccessContext'
import { AccessGate } from './components/AccessGate'
import { Layout } from './components/Layout'
import { BudgetPage } from './pages/Budget'
import { OverviewPage } from './pages/Overview'
import { PlanPage } from './pages/Plan'
import { CostsPage } from './pages/Receipts'

function App() {
  return (
    <AccessProvider>
      <AccessGate>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<OverviewPage />} />
              <Route path="budsjett" element={<BudgetPage />} />
              <Route path="plan" element={<PlanPage />} />
              <Route path="kostnader" element={<CostsPage />} />
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
