import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
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
import SettingsPage from './pages/Settings'
import Reminders from './pages/Reminders'
import Assistant from './pages/Assistant'
import DayReport from './pages/DayReport'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" />
}

function ComingSoon({ titleKey }) {
  const { t } = useT()
  return (
    <div className="card">
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      <p className="text-gray-500 mt-2">{t('coming_soon')}</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/store" element={<Store />} />
        <Route path="/*" element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/day" element={<DayReport />} />
                <Route path="/invoices" element={<Invoicing />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/parties" element={<Parties />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/khata" element={<Ledger />} />
                <Route path="/accounts" element={<ChartOfAccounts />} />
                <Route path="/vouchers" element={<Vouchers />} />
                <Route path="/general-ledger" element={<GeneralLedger />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/store-manage" element={<StoreManage />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
