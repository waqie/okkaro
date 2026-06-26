import { useState, useEffect } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, ScanLine } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import InvoiceDetail from '../Invoicing/InvoiceDetail'
import BarcodeScanner from '../../components/BarcodeScanner'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export default function POS() {
  const { t } = useT()
  const [products, setProducts] = useState([])
  const [parties, setParties] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [partyId, setPartyId] = useState('')
  const [received, setReceived] = useState('')
  const [quick, setQuick] = useState({ name: '', price: '' })
  const [busy, setBusy] = useState(false)
  const [lastInvoice, setLastInvoice] = useState(null)
  const [scan, setScan] = useState(false)

  const onScan = (code) => {
    const p = products.find(x => (x.barcode && x.barcode === code) || String(x.sku) === code)
    if (p) { addToCart(p.name, p.sale_price, p.id); toast.success(p.name) }
    else { setSearch(code); toast(t('scan_not_found')) }
    setScan(false)
  }

  useEffect(() => {
    api.get('/api/inventory/products/').then(r => setProducts(r.data.results || r.data)).catch(() => {})
    api.get('/api/invoicing/parties/?type=customer').then(r => setParties(r.data.results || r.data)).catch(() => {})
  }, [])

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search))

  const addToCart = (name, price, productId = null) => {
    setCart(prev => {
      const i = prev.findIndex(it => it.key === (productId || name))
      if (i >= 0) {
        const copy = [...prev]; copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 }; return copy
      }
      return [...prev, { key: productId || name, product_id: productId, product_name: name, unit_price: Number(price), quantity: 1 }]
    })
  }
  const setQty = (key, q) => setCart(prev => prev.flatMap(it => it.key === key ? (q <= 0 ? [] : [{ ...it, quantity: q }]) : [it]))
  const removeItem = (key) => setCart(prev => prev.filter(it => it.key !== key))

  const total = cart.reduce((s, it) => s + it.unit_price * it.quantity, 0)
  const changeBack = Math.max(0, Number(received || 0) - total)

  const addQuick = () => {
    if (!quick.name || !quick.price) return
    addToCart(quick.name, quick.price)
    setQuick({ name: '', price: '' })
  }

  const ensureWalkIn = async () => {
    if (partyId) return partyId
    const existing = parties.find(p => p.name === t('walk_in') || p.name === 'Walk-in Customer')
    if (existing) return existing.id
    const res = await api.post('/api/invoicing/parties/', { name: 'Walk-in Customer', party_type: 'customer' })
    setParties(prev => [...prev, res.data])
    return res.data.id
  }

  // warn (but don't block) if cart exceeds available stock
  const checkStock = () => {
    const over = []
    cart.forEach(it => {
      const p = products.find(pr => pr.id === it.product_id)
      if (p && p.product_type === 'good' && it.quantity > Number(p.current_stock)) {
        over.push(`${p.name} (stock ${p.current_stock}, sale ${it.quantity})`)
      }
    })
    if (over.length) toast(`⚠ Stock kam hai: ${over.join(', ')}`, { duration: 5000, icon: '⚠️' })
  }

  const completeSale = async () => {
    if (!cart.length) return
    checkStock()
    setBusy(true)
    try {
      const party = await ensureWalkIn()
      const payload = {
        party, date: new Date().toISOString().slice(0, 10), invoice_type: 'sale',
        discount_percent: 0, tax_percent: 0, notes: 'POS',
        items: cart.map(it => ({ product: it.product_id || null, product_name: it.product_name, quantity: it.quantity, unit_price: it.unit_price, unit: 'pcs' })),
      }
      const res = await api.post('/api/invoicing/invoices/', payload)
      const inv = res.data
      // record payment (cash)
      const pay = Number(received || total)
      if (pay > 0) {
        await api.post('/api/invoicing/payments/', {
          party, invoice: inv.id, amount: Math.min(pay, Number(inv.grand_total)),
          method: 'cash', date: payload.date,
        }).catch(() => {})
      }
      // stock is reduced automatically by the backend (invoice stock sync) — no manual movement here
      toast.success(t('sale_done'))
      setCart([]); setReceived(''); setPartyId('')
      // refresh stock + show receipt
      api.get('/api/inventory/products/').then(r => setProducts(r.data.results || r.data)).catch(() => {})
      inv.paid_amount = Math.min(pay, Number(inv.grand_total))
      inv.balance_due = Number(inv.grand_total) - inv.paid_amount
      setLastInvoice(inv)
    } catch { toast.error(t('sale_failed')) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_pos')}</h1><p className="text-gray-500 text-sm mt-1">{t('pos_subtitle')}</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Products */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input ps-9" placeholder={t('search_product')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setScan(true)} className="btn-primary px-3" title={t('scan')}><ScanLine size={18} /> {t('scan')}</button>
          </div>

          {/* quick item */}
          <div className="card p-3 flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-32"><label className="label">{t('quick_item')}</label>
              <input className="input" placeholder={t('item_name')} value={quick.name} onChange={e => setQuick({ ...quick, name: e.target.value })} /></div>
            <div className="w-28"><label className="label">{t('price')}</label>
              <input type="number" className="input" value={quick.price} onChange={e => setQuick({ ...quick, price: e.target.value })} /></div>
            <button onClick={addQuick} className="btn-secondary"><Plus size={15} /> {t('add_to_cart')}</button>
          </div>

          {filtered.length === 0 ? (
            <div className="card text-center text-gray-400 py-10">{t('no_products')}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map(p => (
                <button key={p.id} onClick={() => addToCart(p.name, p.sale_price, p.id)}
                  className="card p-3 text-start hover:border-primary-400 hover:shadow transition active:scale-95">
                  <p className="font-medium text-gray-900 text-sm line-clamp-2">{p.name}</p>
                  <p className="text-primary-700 font-bold text-sm mt-1">{money(p.sale_price)}</p>
                  <p className="text-xs text-gray-400">{Number(p.current_stock)} {p.unit}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="card flex flex-col h-fit lg:sticky lg:top-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><ShoppingCart size={18} /> {t('cart')}</h3>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500">{t('clear_cart')}</button>}
          </div>

          <select className="input mb-3" value={partyId} onChange={e => setPartyId(e.target.value)}>
            <option value="">{t('walk_in')}</option>
            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <div className="space-y-2 max-h-72 overflow-auto">
            {cart.length === 0 ? <p className="text-center text-gray-400 py-8 text-sm">{t('cart_empty')}</p> :
              cart.map(it => (
                <div key={it.key} className="flex items-center gap-2 text-sm border-b border-gray-50 pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{it.product_name}</p>
                    <p className="text-gray-400 text-xs">{money(it.unit_price)} × {it.quantity} = {money(it.unit_price * it.quantity)}</p>
                  </div>
                  <button onClick={() => setQty(it.key, it.quantity - 1)} className="p-1 bg-gray-100 rounded"><Minus size={13} /></button>
                  <span className="w-6 text-center">{it.quantity}</span>
                  <button onClick={() => setQty(it.key, it.quantity + 1)} className="p-1 bg-gray-100 rounded"><Plus size={13} /></button>
                  <button onClick={() => removeItem(it.key)} className="p-1 text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
          </div>

          <div className="border-t border-gray-200 mt-3 pt-3 space-y-2">
            <div className="flex justify-between font-bold text-lg"><span>{t('total_label')}</span><span className="text-primary-700">{money(total)}</span></div>
            <div>
              <label className="label">{t('received_amount')}</label>
              <input type="number" className="input" value={received} onChange={e => setReceived(e.target.value)} placeholder={String(total)} />
            </div>
            {changeBack > 0 && <div className="flex justify-between text-sm text-gray-600"><span>{t('change_return')}</span><span className="font-semibold">{money(changeBack)}</span></div>}
            <button onClick={completeSale} disabled={busy || cart.length === 0}
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50">
              {t('complete_sale')}
            </button>
          </div>
        </div>
      </div>

      {lastInvoice && (
        <InvoiceDetail invoice={lastInvoice} onClose={() => setLastInvoice(null)} onChanged={() => {}} />
      )}
      {scan && <BarcodeScanner onDetected={onScan} onClose={() => setScan(false)} />}
    </div>
  )
}
