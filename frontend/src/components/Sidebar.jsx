import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, FileText, FileCheck, Package, Users, BarChart2, Settings, LogOut, Globe, Wallet, BookOpen, Library, LineChart, Store, BellRing, Sparkles, CalendarDays, BookText, ScrollText, Building2, Calculator } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { routeAllowed } from '../plan'
import { useT } from '../i18n'
import Logo from './Logo'

export default function Sidebar({ onNavigate }) {
  const { user, logout, plan } = useAuthStore()
  const { t, toggle } = useT()
  const navigate = useNavigate()

  const allNavItems = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/day', icon: CalendarDays, label: t('nav_day') },
    { to: '/pos', icon: ShoppingCart, label: t('nav_pos') },
    { to: '/invoices', icon: FileText, label: t('invoicing') },
    { to: '/quotations', icon: FileCheck, label: t('nav_quotations') },
    { to: '/inventory', icon: Package, label: t('inventory') },
    { to: '/parties', icon: Users, label: t('parties') },
    { to: '/reminders', icon: BellRing, label: t('nav_reminders') },
    { to: '/expenses', icon: Wallet, label: t('nav_expenses') },
    { to: '/khata', icon: BookOpen, label: t('nav_khata') },
    { to: '/vouchers', icon: BookText, label: t('nav_vouchers') },
    { to: '/general-ledger', icon: ScrollText, label: t('nav_gl') },
    { to: '/reports', icon: BarChart2, label: t('reports') },
    { to: '/insights', icon: LineChart, label: t('nav_insights') },
    { to: '/pricing', icon: Calculator, label: t('nav_pricing') },
    { to: '/assistant', icon: Sparkles, label: t('nav_assistant') },
    { to: '/store-manage', icon: Store, label: t('nav_store') },
    { to: '/accounts', icon: Library, label: t('nav_accounts') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ]

  const navItems = allNavItems.filter((i) => routeAllowed(plan, i.to))
  if (user?.is_superuser) navItems.push({ to: '/owner', icon: Building2, label: t('nav_owner') })

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-primary-900 to-primary-950 text-white w-64 min-w-64">
      {/* Logo */}
      <div className="flex items-center px-6 py-5 border-b border-primary-800">
        <img src="/okkaro-logo-white.png" alt="OKKARO" className="h-9 w-auto" />
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
               ${isActive ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md' : 'text-primary-300 hover:bg-primary-800/60 hover:text-white'}`
            }>
            <Icon size={18} />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Language toggle */}
      <div className="px-3">
        <button onClick={toggle}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors">
          <Globe size={16} /> {t('language_name')}
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-primary-800 mt-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
            {user?.first_name?.[0] || user?.username?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.first_name || user?.username}</p>
            <p className="text-xs text-primary-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors">
          <LogOut size={16} /> {t('sign_out')}
        </button>
      </div>
    </div>
  )
}
