import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, FileText, FileCheck, Package, Users, BarChart2, Settings, LogOut, Globe, Wallet, BookOpen, Library, LineChart, Store, BellRing, Sparkles, CalendarDays, BookText, ScrollText, Building2, Calculator, Network } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { routeAllowed } from '../plan'
import { useT } from '../i18n'
import Logo from './Logo'

export default function Sidebar({ onNavigate }) {
  const { user, logout, plan, business } = useAuthStore()
  const { t, toggle } = useT()
  const navigate = useNavigate()

  // Grouped menu — most-used on top, clear sections so nothing has to be hunted for.
  const toolsItems = [
    { to: '/branches', icon: Network, label: 'Branches' },
    { to: '/assistant', icon: Sparkles, label: t('nav_assistant') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ]
  if (user?.is_superuser) toolsItems.push({ to: '/owner', icon: Building2, label: t('nav_owner') })
  if (user?.is_superuser) toolsItems.push({ to: '/blog-admin', icon: ScrollText, label: 'Blog' })

  const groups = [
    { title: t('grp_daily'), items: [
      { to: '/', icon: LayoutDashboard, label: t('dashboard') },
      { to: '/pos', icon: ShoppingCart, label: t('nav_pos') },
      { to: '/day', icon: CalendarDays, label: t('nav_day') },
    ]},
    { title: t('grp_sales'), items: [
      { to: '/invoices', icon: FileText, label: t('invoicing') },
      { to: '/quotations', icon: FileCheck, label: t('nav_quotations') },
      { to: '/parties', icon: Users, label: t('parties') },
      { to: '/reminders', icon: BellRing, label: t('nav_reminders') },
    ]},
    { title: t('grp_stock'), items: [
      { to: '/inventory', icon: Package, label: t('inventory') },
      { to: '/store-manage', icon: Store, label: t('nav_store') },
      { to: '/pricing', icon: Calculator, label: t('nav_pricing') },
    ]},
    { title: t('grp_money'), items: [
      { to: '/expenses', icon: Wallet, label: t('nav_expenses') },
      { to: '/khata', icon: BookOpen, label: t('nav_khata') },
      { to: '/vouchers', icon: BookText, label: t('nav_vouchers') },
      { to: '/accounts', icon: Library, label: t('nav_accounts') },
    ]},
    { title: t('grp_reports'), items: [
      { to: '/reports', icon: BarChart2, label: t('reports') },
      { to: '/general-ledger', icon: ScrollText, label: t('nav_gl') },
      { to: '/insights', icon: LineChart, label: t('nav_insights') },
    ]},
    { title: t('grp_tools'), items: toolsItems },
  ].map(g => ({ ...g, items: g.items.filter(i => routeAllowed(plan, i.to, user?.is_superuser)) }))
   .filter(g => g.items.length)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-primary-900 to-primary-950 text-white w-64 min-w-64">
      {/* Logo — business's own brand if set, else OKKARO */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-800">
        {business?.logo_base64 ? (
          <>
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
              <img src={business.logo_base64} alt={business.business_name} className="max-w-full max-h-full object-contain" />
            </div>
            <span className="font-display font-bold text-base leading-tight truncate">{business.business_name}</span>
          </>
        ) : (
          <img src="/okkaro-logo-white.png" alt="OKKARO" className="h-9 w-auto" />
        )}
      </div>

      {/* Nav — grouped */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-4">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-primary-400/80">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                     ${isActive ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md' : 'text-primary-300 hover:bg-primary-800/60 hover:text-white'}`
                  }>
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
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
        {business?.logo_base64 && (
          <div className="flex items-center gap-1.5 mt-3 opacity-60">
            <span className="text-[10px] text-primary-300">Powered by</span>
            <img src="/okkaro-logo-white.png" alt="OKKARO" className="h-3 w-auto" />
          </div>
        )}
      </div>
    </div>
  )
}
