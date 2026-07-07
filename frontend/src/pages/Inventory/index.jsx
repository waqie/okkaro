import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Package, AlertTriangle, ScanLine, Barcode, Printer, X, Upload, FileDown, Pencil, Trash2 } from 'lucide-react'
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
  const [editing, setEditing] = useState(null)
  const blankProduct = () => ({ name: '', product_type: 'good', sku: '', barcode: '', category_name: '', sale_price: '', purchase_price: '', current_stock: 0, reorder_level: 5, unit: 'pcs', image_base64: '' })
  const [form, setForm] = useState(blankProduct())

  const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n }

  // resize an uploaded image to ~600px and store as a base64 data URL
  const fileToImage = (file) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const max = 600, scale = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = img.width * scale; c.height = img.height * scale
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        setForm(f => ({ ...f, image_base64: c.toDataURL('image/jpeg', 0.8) }))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

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

  const openNew = () => { setEditing(null); setForm(blankProduct()); setShowForm(true) }
  const openEdit = (p) => {
    setEditing(p.id)
    setForm({ name: p.name, product_type: p.product_type || 'good', sku: p.sku || '', barcode: p.barcode || '', category_name: p.category_name || '', sale_price: p.sale_price, purchase_price: p.purchase_price, current_stock: p.current_stock, reorder_level: p.reorder_level, unit: p.unit, image_base64: p.image_base64 || '' })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(blankProduct()) }

  // resolve a typed category name → existing id, or create a new category
  const resolveCategory = async (name) => {
    const n = (name || '').trim()
    if (!n) return null
    const found = categories.find(c => (c.name || '').toLowerCase() === n.toLowerCase())
    if (found) return found.id
    try {
      const r = await api.post('/api/inventory/categories/', { name: n })
      setCategories(prev => [...prev, r.data])
      return r.data.id
    } catch { return null }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const isService = form.product_type === 'service'
      const category = await resolveCategory(form.category_name)
      const { category_name, ...rest } = form
      const payload = {
        ...rest, category,
        current_stock: isService ? 0 : rest.current_stock,
        reorder_level: isService ? 0 : rest.reorder_level,
      }
      if (editing) { await api.patch(`/api/inventory/products/${editing}/`, payload); toast.success('Product updated') }
      else { await api.post('/api/inventory/products/', payload); toast.success('Product added!') }
      closeForm()
      fetchProducts()
    } catch (err) { toast.error(err.response?.data ? JSON.stringify(err.response.data).slice(0, 120) : 'Failed to save product') }
  }

  const delProduct = async (p) => {
    if (!confirm(`Delete ${p.name}?`)) return
    try { await api.delete(`/api/inventory/products/${p.id}/`); toast.success('Deleted'); fetchProducts() }
    catch { toast.error('Error (shayad invoices se judा hai)') }
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
          <button onClick={openNew} className="btn-primary">
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
                <div className="flex-1 flex items-start gap-2">
                  {p.image_base64 && <img src={p.image_base64} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">SKU: {p.sku || '—'} · {p.category_name || 'Uncategorized'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.stock_status === 'out' && (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Out of stock
                    </span>
                  )}
                  {p.stock_status === 'low' && (
                    <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Low
                    </span>
                  )}
                  {p.stock_status === 'service' && (
                    <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">Service</span>
                  )}
                  <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"><Pencil size={16} /></button>
                  <button onClick={() => setBarcodeOf(p)} title="Barcode" className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Barcode size={16} /></button>
                  <button onClick={() => delProduct(p)} title="Delete" className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Stock</p>
                  <p className={`text-base font-bold ${p.stock_status === 'service' ? 'text-gray-400' : p.stock_status === 'out' ? 'text-red-600' : p.stock_status === 'low' ? 'text-orange-600' : 'text-gray-900'}`}>
                    {p.product_type === 'service' ? '—' : `${p.current_stock} ${p.unit}`}
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
              <h2 className="text-lg font-semibold">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {form.image_base64 ? <img src={form.image_base64} alt="" className="w-full h-full object-cover" /> : <Package size={22} className="text-gray-300" />}
                  </div>
                  <div>
                    <label className="btn-secondary cursor-pointer inline-flex">
                      <Upload size={14} /> {form.image_base64 ? 'Change photo' : 'Add photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) fileToImage(f) }} />
                    </label>
                    {form.image_base64 && <button type="button" onClick={() => setForm(f => ({ ...f, image_base64: '' }))} className="ms-2 text-xs text-red-500">Remove</button>}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="label">Product Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Basmati Rice 5kg" />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.product_type} onChange={e => setForm({...form, product_type: e.target.value})}>
                    <option value="good">Good (tracks stock)</option>
                    <option value="service">Service (no stock)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Category</label>
                  <input className="input" list="catlist" value={form.category_name} onChange={e => setForm({...form, category_name: e.target.value})} placeholder="e.g. Drinks" />
                  <datalist id="catlist">{categories.map(c => <option key={c.id} value={c.name} />)}</datalist>
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
                {form.product_type === 'good' && <>
                <div>
                  <label className="label">Opening Stock</label>
                  <input type="number" className="input" value={form.current_stock} onChange={e => setForm({...form, current_stock: e.target.value})} min="0" />
                </div>
                <div>
                  <label className="label">Reorder Level (low-stock alert)</label>
                  <input type="number" className="input" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: e.target.value})} min="0" />
                </div>
                </>}
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
