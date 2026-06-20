import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { routeAllowed } from './plan'
import { useT } from './i18n'
import Layout from './components/Layout'
import Login from './pages/Auth/Login'
import Dashboard from './pages/Dashboard'
import Invoicing from './pages/Invoicing'
import Inventory from './pages/Inventory'
import Parties from './pages/Invoicing/Parties'
import POS from './pages/POS'
import Quotations from './pages/Quotations'
import Expenses from './pages/Accounting/Expenses'
import Reports from './pages/Accounting/Reports'
import Ledger from './pages/Accounting/Ledger'
import ChartOfAccounts from './pages/Accounting/ChartOfAccounts'
import Vouchers from './pages/Accounting/Vouchers'
import GeneralLedger from './pages/Accounting/GeneralLedger'
import Insights from './pages/Insights'
import Store from './pages/Store'
import StoreManage from './pages/Store/Manage'
import Landing from './pages/Landing'
import SettingsPage from './pages/Settings'
import Reminders from './pages/Reminders'
import Assistant from './pages/Assistant'
import DayReport from './pages/DayReport'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/welcome" />
}

function Gated({ to, children }) {
  const { plan } = useAuthStore()
  const { t } = useT()
  if (routeAllowed(plan, to)) return children
  return (
    <div className="card max-w-md">
      <h1 className="text-xl font-bold text-gray-900">🔒 {t('locked_title')}</h1>
      <p className="text-gray-500 mt-2">{t('locked_desc')}</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/store" element={<Store />} />
        <Route path="/*" element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pos" element={<Gated to="/pos"><POS /></Gated>} />
                <Route path="/day" element={<DayReport />} />
                <Route path="/invoices" element={<Invoicing />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/inventory" element={<Gated to="/inventory"><Inventory /></Gated>} />
                <Route path="/parties" element={<Parties />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/expenses" element={<Gated to="/expenses"><Expenses /></Gated>} />
                <Route path="/khata" element={<Ledger />} />
                <Route path="/accounts" element={<Gated to="/accounts"><ChartOfAccounts /></Gated>} />
                <Route path="/vouchers" element={<Gated to="/vouchers"><Vouchers /></Gated>} />
                <Route path="/general-ledger" element={<Gated to="/general-ledger"><GeneralLedger /></Gated>} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/insights" element={<Gated to="/insights"><Insights /></Gated>} />
                <Route path="/store-manage" element={<Gated to="/store-manage"><StoreManage /></Gated>} />
                <Route path="/assistant" element={<Gated to="/assistant"><Assistant /></Gated>} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
