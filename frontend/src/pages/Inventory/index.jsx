import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Package, AlertTriangle, ScanLine, Barcode, Printer, X, Upload, FileDown } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import BarcodeScanner from '../../components/BarcodeScanner'
import { parseCSV, exportCSV } from '../../utils/exporter'

function BarcodeModal({ product, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const code = product.barcode || product.sku || `P${product.id}`
    if (window.JsBarcode && ref.current) {
      try { window.JsBarcode(ref.current, code, { format: 'CODE128', displayValue: true, width: 2, height: 60, fontSize: 14 }) } catch { /* ignore */ }
    }
  }, [product])
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs">
        <div className="no-print flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Barcode</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div id="print-area" className="p-6 text-center">
          <p className="font-semibold text-gray-900 mb-1">{product.name}</p>
          <p className="text-sm text-gray-500 mb-3">Rs. {Number(product.sale_price).toLocaleString()}</p>
          <svg ref={ref} className="mx-auto" />
        </div>
        <div className="no-print p-4 border-t">
          <button onClick={() => window.print()} className="btn-primary w-full justify-center"><Printer size={15} /> Print</button>
        </div>
      </div>
    </div>
  )
}

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [categories, setCategories] = useState([])
  const [scan, setScan] = useState(false)
  const [barcodeOf, setBarcodeOf] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', category: '', sale_price: '', purchase_price: '', current_stock: 0, reorder_level: 5, unit: 'pcs' })

  const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n }

  const importFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const rows = parseCSV(await file.text())
      let n = 0
      for (const r of rows) {
        const name = r.name || r.product || r['product name'] || r.naam
        if (!name) continue
        try {
          await api.post('/api/inventory/products/', {
            name,
            sku: r.sku || '',
            barcode: r.barcode || '',
            sale_price: num(r.sale_price || r.price || r['sale price'] || 0),
            purchase_price: num(r.purchase_price || r['purchase price'] || r.cost || 0),
            current_stock: num(r.stock || r.current_stock || r.qty || r.quantity || 0),
            reorder_level: num(r.reorder_level || r.reorder || 5),
            unit: (r.unit || 'pcs').toLowerCase(),
          })
          n++
        } catch { /* skip bad row */ }
      }
      toast.success(`${n} ${'rows imported'}`)
      fetchProducts()
    } finally { setImporting(false); e.target.value = '' }
  }

  const downloadTemplate = () => exportCSV('products-template.csv',
    [{ name: 'Basmati Rice 5kg', sku: 'RICE5', barcode: '8901234567890', sale_price: 1500, purchase_price: 1200, stock: 50, unit: 'pcs', reorder_level: 5 }],
    [{ key: 'name', label: 'name' }, { key: 'sku', label: 'sku' }, { key: 'barcode', label: 'barcode' },
     { key: 'sale_price', label: 'sale_price' }, { key: 'purchase_price', label: 'purchase_price' },
     { key: 'stock', label: 'stock' }, { key: 'unit', label: 'unit' }, { key: 'reorder_level', label: 'reorder_level' }])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (lowStock) params.append('low_stock', 'true')
      const res = await api.get(`/api/inventory/products/?${params}`)
      setProducts(res.data.results || res.data)
    } catch { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProducts() }, [search, lowStock])
  useEffect(() => { api.get('/api/inventory/categories/').then(r => setCategories(r.data.results || r.data)).catch(() => {}) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/inventory/products/', form)
      toast.success('Product added!')
      setShowForm(false)
      setForm({ name: '', sku: '', barcode: '', category: '', sale_price: '', purchase_price: '', current_stock: 0, reorder_level: 5, unit: 'pcs' })
      fetchProducts()
    } catch { toast.error('Failed to add product') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">Manage products and stock levels</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv" onChange={importFile} className="hidden" />
          <button onClick={downloadTemplate} className="btn-secondary"><FileDown size={15} /> Template</button>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary">
            <Upload size={15} /> {importing ? 'Importing...' : 'Import'}
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex gap-3 flex-wrap p-4">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search products / barcode..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setScan(true)} className="btn-secondary"><ScanLine size={15} /> Scan</button>
        <button onClick={() => setLowStock(!lowStock)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${lowStock ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <AlertTriangle size={14} /> Low Stock
        </button>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : products.length === 0 ? (
        <div className="card text-center py-16">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No products found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first product to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">SKU: {p.sku || '—'} · {p.category_name || 'Uncategorized'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.low_stock && (
                    <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Low
                    </span>
                  )}
                  <button onClick={() => setBarcodeOf(p)} title="Barcode" className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Barcode size={16} /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Stock</p>
                  <p className={`text-base font-bold ${p.current_stock <= 0 ? 'text-red-600' : p.low_stock ? 'text-orange-600' : 'text-gray-900'}`}>
                    {p.current_stock} {p.unit}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Sale Price</p>
                  <p className="text-base font-bold text-green-700">Rs.{Number(p.sale_price).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Value</p>
                  <p className="text-base font-bold text-blue-700">Rs.{Number(p.stock_value).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Product</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Product Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Basmati Rice 5kg" />
                </div>
                <div>
                  <label className="label">SKU</label>
                  <input className="input" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="Auto or manual" />
                </div>
                <div>
                  <label className="label flex items-center justify-between">Barcode
                    <button type="button" onClick={() => setScan('form')} className="text-xs text-primary-600 flex items-center gap-1"><ScanLine size={12} /> Scan</button>
                  </label>
                  <input className="input" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="Scan or type" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                    {['pcs','kg','g','ltr','mtr','box','dz','set'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Sale Price (Rs.)</label>
                  <input type="number" className="input" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})} required min="0" />
                </div>
                <div>
                  <label className="label">Purchase Price (Rs.)</label>
                  <input type="number" className="input" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} min="0" />
                </div>
                <div>
                  <label className="label">Opening Stock</label>
                  <input type="number" className="input" value={form.current_stock} onChange={e => setForm({...form, current_stock: e.target.value})} min="0" />
                </div>
                <div>
                  <label className="label">Reorder Level</label>
                  <input type="number" className="input" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: e.target.value})} min="0" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Add Product</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {barcodeOf && <BarcodeModal product={barcodeOf} onClose={() => setBarcodeOf(null)} />}
      {scan && <BarcodeScanner onDetected={(code) => {
        if (scan === 'form') setForm(f => ({ ...f, barcode: code }))
        else setSearch(code)
        setScan(false)
      }} onClose={() => setScan(false)} />}
    </div>
  )
}
