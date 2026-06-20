import { useState, useEffect } from 'react'
import { Calculator, Save } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'

const n = (v) => parseFloat(v) || 0

const blank = {
  title: '', sku: '',
  buy_currency: 'USD', buy_cost: '', exchange_rate: '280',
  sell_currency: 'PKR', shipping: '', ads_cost: '', packaging: '',
  marketplace_fee_pct: '', payment_fee_pct: '', margin_pct: '30',
}

export default function Pricing() {
  const { t } = useT()
  const [f, setF] = useState(blank)
  const [list, setList] = useState([])

  const fetchList = () => api.get('/api/ecommerce/listings/').then(r => setList(r.data.results || r.data)).catch(() => {})
  useEffect(() => { fetchList() }, [])

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // live calculation (same formula as backend)
  const base = n(f.buy_cost) * n(f.exchange_rate) + n(f.shipping) + n(f.ads_cost) + n(f.packaging)
  const pct = (n(f.marketplace_fee_pct) + n(f.payment_fee_pct) + n(f.margin_pct)) / 100
  const price = pct < 1 && pct >= 0 ? base / (1 - pct) : base
  const fees = price * (n(f.marketplace_fee_pct) + n(f.payment_fee_pct)) / 100
  const profit = price - base - fees
  const money = (v) => `${f.sell_currency} ` + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

  const save = async (e) => {
    e.preventDefault()
    try { await api.post('/api/ecommerce/listings/', f); toast.success(t('listing_saved')); setF(blank); fetchList() }
    catch { toast.error('Error') }
  }

  const toInventory = async (l) => {
    try {
      await api.post('/api/inventory/products/', {
        name: l.title, sku: l.sku || '',
        sale_price: l.recommended_price, purchase_price: l.landing_cost,
        current_stock: 0, unit: 'pcs',
      })
      toast.success('Added to Inventory — ab POS/Invoice se becho, accounting mein chala jayega')
    } catch { toast.error('Error (shayad pehle se hai)') }
  }

  const Field = ({ k, label, suffix, w = '' }) => (
    <div className={w}>
      <label className="label">{label}</label>
      <div className="relative">
        <input type={k === 'title' || k === 'sku' || k === 'buy_currency' || k === 'sell_currency' ? 'text' : 'number'}
          className="input" value={f[k]} onChange={e => set(k, e.target.value)} />
        {suffix && <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center text-white"><Calculator size={22} /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_pricing')}</h1><p className="text-gray-500 text-sm">{t('pricing_subtitle')}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inputs */}
        <form onSubmit={save} className="lg:col-span-2 card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field k="title" label="Product / Listing" />
            <Field k="sku" label="SKU (optional)" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field k="buy_currency" label="Buy Currency" />
            <Field k="buy_cost" label="Product Cost" />
            <Field k="exchange_rate" label="Exchange Rate" suffix={`→${f.sell_currency}`} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field k="shipping" label="Shipping" />
            <Field k="ads_cost" label="Ads / unit" />
            <Field k="packaging" label="Packaging" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field k="marketplace_fee_pct" label="Marketplace Fee" suffix="%" />
            <Field k="payment_fee_pct" label="Payment Fee" suffix="%" />
            <Field k="margin_pct" label="Desired Margin" suffix="%" />
          </div>
          <Field k="sell_currency" label="Sell Currency" w="w-32" />
          <button type="submit" className="btn-primary"><Save size={15} /> Save Listing</button>
        </form>

        {/* Live result */}
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

      {/* Saved listings */}
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
