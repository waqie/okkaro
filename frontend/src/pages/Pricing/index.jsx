import { useState, useEffect } from 'react'
import { Calculator, Save } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'

const n = (v) => parseFloat(v) || 0

const blank = {
  title: '', sku: '', stock: '',
  buy_currency: 'USD', buy_cost: '', exchange_rate: '280',
  sell_currency: 'PKR', shipping: '', ads_cost: '', packaging: '',
  marketplace_fee_pct: '', payment_fee_pct: '', margin_pct: '30',
}

const CURRENCIES = ['PKR', 'USD', 'CNY', 'AED', 'SAR', 'GBP', 'EUR', 'INR', 'TRY']

// Defined OUTSIDE the page so inputs don't remount (keeps focus while typing).
function In({ label, value, onChange, type = 'number', suffix }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input type={type} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  )
}

function Cur({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

export default function Pricing() {
  const { t } = useT()
  const [f, setF] = useState(blank)
  const [list, setList] = useState([])
  const [fx, setFx] = useState('')

  const fetchList = () => api.get('/api/ecommerce/listings/').then(r => setList(r.data.results || r.data)).catch(() => {})
  useEffect(() => { fetchList() }, [])

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // auto exchange rate when currencies change
  useEffect(() => {
    if (f.buy_currency === f.sell_currency) { setF(p => ({ ...p, exchange_rate: '1' })); setFx('same'); return }
    setFx('loading')
    fetch(`https://open.er-api.com/v6/latest/${f.buy_currency}`)
      .then(r => r.json())
      .then(d => {
        const rate = d?.rates?.[f.sell_currency]
        if (rate) { setF(p => ({ ...p, exchange_rate: String(Number(rate).toFixed(2)) })); setFx('ok') }
        else setFx('manual')
      })
      .catch(() => setFx('manual'))
    // eslint-disable-next-line
  }, [f.buy_currency, f.sell_currency])

  const base = n(f.buy_cost) * n(f.exchange_rate) + n(f.shipping) + n(f.ads_cost) + n(f.packaging)
  const pct = (n(f.marketplace_fee_pct) + n(f.payment_fee_pct) + n(f.margin_pct)) / 100
  const price = pct < 1 && pct >= 0 ? base / (1 - pct) : base
  const fees = price * (n(f.marketplace_fee_pct) + n(f.payment_fee_pct)) / 100
  const profit = price - base - fees
  const money = (v) => `${f.sell_currency} ` + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

  const save = async (e) => {
    e.preventDefault()
    if (!f.title.trim()) { toast.error('Product/Listing name likhein'); return }
    const payload = {
      title: f.title, sku: f.sku, stock: n(f.stock), buy_currency: f.buy_currency, sell_currency: f.sell_currency,
      buy_cost: n(f.buy_cost), exchange_rate: n(f.exchange_rate) || 1,
      shipping: n(f.shipping), ads_cost: n(f.ads_cost), packaging: n(f.packaging),
      marketplace_fee_pct: n(f.marketplace_fee_pct), payment_fee_pct: n(f.payment_fee_pct), margin_pct: n(f.margin_pct),
    }
    try { await api.post('/api/ecommerce/listings/', payload); toast.success(t('listing_saved')); setF(blank); fetchList() }
    catch (err) { toast.error(err.response?.data ? JSON.stringify(err.response.data).slice(0, 120) : 'Error') }
  }

  const toInventory = async (l) => {
    try {
      await api.post('/api/inventory/products/', {
        name: l.title, sku: l.sku || '', sale_price: l.recommended_price,
        purchase_price: l.landing_cost, current_stock: 0, unit: 'pcs',
      })
      toast.success('Added to Inventory — ab POS/Invoice se becho')
    } catch { toast.error('Error (shayad pehle se hai)') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center text-white"><Calculator size={22} /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_pricing')}</h1><p className="text-gray-500 text-sm">{t('pricing_subtitle')}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={save} className="lg:col-span-2 card space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <In label="Product / Listing" type="text" value={f.title} onChange={v => set('title', v)} />
            <In label="SKU (optional)" type="text" value={f.sku} onChange={v => set('sku', v)} />
            <In label="Stock / Qty" value={f.stock} onChange={v => set('stock', v)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Cur label="Buy Currency" value={f.buy_currency} onChange={v => set('buy_currency', v)} />
            <In label="Product Cost" value={f.buy_cost} onChange={v => set('buy_cost', v)} />
            <In label="Rate (auto)" value={f.exchange_rate} onChange={v => set('exchange_rate', v)} suffix={`→${f.sell_currency}`} />
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            {fx === 'loading' ? 'Rate laa rahe hain…' : fx === 'ok' ? `Auto rate: 1 ${f.buy_currency} = ${f.exchange_rate} ${f.sell_currency} (edit kar sakte hain)` : fx === 'same' ? '' : fx === 'manual' ? 'Auto rate na mila — khud likhein' : ''}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <In label="Shipping" value={f.shipping} onChange={v => set('shipping', v)} />
            <In label="Ads / unit" value={f.ads_cost} onChange={v => set('ads_cost', v)} />
            <In label="Packaging" value={f.packaging} onChange={v => set('packaging', v)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <In label="Marketplace Fee" value={f.marketplace_fee_pct} onChange={v => set('marketplace_fee_pct', v)} suffix="%" />
            <In label="Payment Fee" value={f.payment_fee_pct} onChange={v => set('payment_fee_pct', v)} suffix="%" />
            <In label="Desired Margin" value={f.margin_pct} onChange={v => set('margin_pct', v)} suffix="%" />
          </div>
          <Cur label="Sell Currency" value={f.sell_currency} onChange={v => set('sell_currency', v)} />
          <button type="submit" className="btn-primary"><Save size={15} /> Save Listing</button>
        </form>

        <div className="card bg-gradient-to-br from-primary-700 to-primary-950 text-white h-fit lg:sticky lg:top-4">
          <p className="text-primary-200 text-sm">Recommended Selling Price</p>
          <p className="text-4xl font-extrabold mt-1">{money(price)}</p>
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between border-t border-white/15 pt-2"><span className="text-primary-200">Landing Cost</span><span>{money(base)}</span></div>
            <div className="flex justify-between"><span className="text-primary-200">Fees</span><span>{money(fees)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t border-white/15 pt-2"><span>Profit / unit</span><span className="text-green-300">{money(profit)}</span></div>
            <div className="flex justify-between"><span className="text-primary-200">Margin</span><span>{price > 0 ? (profit / price * 100).toFixed(1) : 0}%</span></div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">{t('saved_listings')}</h3>
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Product', 'Cost', 'Price', 'Profit', 'Margin', ''].map((h, i) => <th key={i} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${i && i < 5 ? 'text-end' : 'text-start'}`}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No listings yet</td></tr>
              ) : list.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{l.title}</td>
                  <td className="px-4 py-2 text-end text-gray-500">{l.sell_currency} {Number(l.landing_cost).toLocaleString()}</td>
                  <td className="px-4 py-2 text-end font-semibold text-primary-700">{l.sell_currency} {Number(l.recommended_price).toLocaleString()}</td>
                  <td className="px-4 py-2 text-end text-green-700">{l.sell_currency} {Number(l.profit).toLocaleString()}</td>
                  <td className="px-4 py-2 text-end">{Number(l.recommended_price) > 0 ? (Number(l.profit) / Number(l.recommended_price) * 100).toFixed(0) : 0}%</td>
                  <td className="px-4 py-2"><button onClick={() => toInventory(l)} className="text-xs text-primary-600 font-medium hover:underline whitespace-nowrap">→ Inventory</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
