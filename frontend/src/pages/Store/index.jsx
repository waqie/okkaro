import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Minus, ShoppingBag, Share2, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { useT } from '../../i18n'
import { openWhatsApp } from '../../utils/whatsapp'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export default function Store() {
  const { t, lang, toggle, dir } = useT()
  const [shop, setShop] = useState({ business_name: 'OKKARO Store', phone: '' })
  const [products, setProducts] = useState([])
  const [order, setOrder] = useState([])

  const shopParam = new URLSearchParams(window.location.search).get('shop')
  const q = shopParam ? `?shop=${encodeURIComponent(shopParam)}` : ''

  useEffect(() => {
    axios.get(`${API}/api/store/info/${q}`).then(r => setShop(r.data)).catch(() => {})
    axios.get(`${API}/api/store/products/${q}`).then(r => setProducts(r.data)).catch(() => {})
  }, [])

  const add = (p) => setOrder(prev => {
    const i = prev.findIndex(x => x.id === p.id)
    if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], qty: c[i].qty + 1 }; return c }
    return [...prev, { id: p.id, name: p.name, price: Number(p.sale_price), qty: 1 }]
  })
  const setQty = (id, q) => setOrder(prev => prev.flatMap(x => x.id === id ? (q <= 0 ? [] : [{ ...x, qty: q }]) : [x]))
  const total = order.reduce((s, x) => s + x.price * x.qty, 0)

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success(t('store_link_copied')) }
    catch { toast(window.location.href) }
  }

  const sendOrder = () => {
    if (!order.length) return
    const lines = [t('store_order_intro'), '', ...order.map(x => `• ${x.name} × ${x.qty} = ${money(x.price * x.qty)}`), '', `${t('total_label')}: ${money(total)}`]
    openWhatsApp(shop.phone, lines.join('\n'))
  }

  return (
    <div dir={dir} className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <header className="bg-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center font-bold">O</div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{shop.business_name}</h1>
              {shop.city && <p className="text-primary-200 text-xs">{shop.city}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="text-xs border border-primary-400 rounded px-2 py-1 flex items-center gap-1"><Globe size={13} />{lang === 'ur' ? 'English' : 'اردو'}</button>
            <button onClick={share} className="text-xs border border-primary-400 rounded px-2 py-1 flex items-center gap-1"><Share2 size={13} />{t('store_share')}</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 pb-32">
        {products.length === 0 ? (
          <p className="text-center text-gray-400 py-16">{t('store_empty')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col">
                <div className="aspect-square bg-primary-50 rounded-lg flex items-center justify-center mb-2 text-primary-300 overflow-hidden">
                  {p.image_base64
                    ? <img src={p.image_base64} alt={p.name} className="w-full h-full object-cover" />
                    : <ShoppingBag size={32} />}
                </div>
                <p className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">{p.name}</p>
                <p className="text-primary-700 font-bold mt-1">{money(p.sale_price)}</p>
                <button onClick={() => add(p)} className="btn-primary mt-2 py-1.5 justify-center text-sm">{t('add_to_cart')}</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Order bar */}
      {order.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-2xl">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="max-h-32 overflow-auto mb-2 space-y-1">
              {order.map(x => (
                <div key={x.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{x.name}</span>
                  <button onClick={() => setQty(x.id, x.qty - 1)} className="p-1 bg-gray-100 rounded"><Minus size={12} /></button>
                  <span className="w-6 text-center">{x.qty}</span>
                  <button onClick={() => setQty(x.id, x.qty + 1)} className="p-1 bg-gray-100 rounded"><Plus size={12} /></button>
                  <span className="w-20 text-end font-medium">{money(x.price * x.qty)}</span>
                </div>
              ))}
            </div>
            <button onClick={sendOrder} className="btn-primary w-full justify-center py-3">
              {t('store_send_order')} · {money(total)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
