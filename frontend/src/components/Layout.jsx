import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { Toaster } from 'react-hot-toast'
import { useT } from '../i18n'

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)
  const { lang, toggle, dir } = useT()
  const mainRef = useRef(null)
  const loc = useLocation()
  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0 }, [loc.pathname])

  return (
    <div className="flex h-screen overflow-hidden" dir={dir}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute top-0 bottom-0 start-0 z-50 shadow-2xl">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between bg-primary-950 text-white px-4 py-3">
          <button onClick={() => setOpen(true)} aria-label="menu" className="p-1">
            <Menu size={22} />
          </button>
          <span className="font-bold tracking-tight">OKKARO</span>
          <button onClick={toggle} className="text-xs border border-primary-700 rounded-md px-2 py-1">
            {lang === 'ur' ? 'English' : 'اردو'}
          </button>
        </div>

        <main ref={mainRef} className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      <Toaster position="top-center" />
    </div>
  )
}
