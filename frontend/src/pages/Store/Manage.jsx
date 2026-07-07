import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store as StoreIcon, ExternalLink, Copy, Share2, AlertTriangle, Package } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import { openWhatsApp } from '../../utils/whatsapp'

export default function StoreManage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [phone, setPhone] = useState(null)
  const [schema, setSchema] = useState('')
  const [products, setProducts] = useState([])

  useEffect(() => {
    api.get('/api/business/').then(r => { setPhone(r.data.phone || ''); setSchema(r.data.schema || '') }).catch(() => setPhone(''))
    api.get('/api/inventory/products/?page_size=1000').then(r => setProducts(r.data.results || r.data)).catch(() => {})
  }, [])

  const link = `${window.location.origin}/store${schema ? `?shop=${schema}` : ''}`
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast.success(t('link_copied')) } catch { toast(link) } }
  const shareWa = () => openWhatsApp('', `${t('store_intro')}\n${link}`)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center text-white"><StoreIcon size={22} /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_store')}</h1><p className="text-gray-500 text-sm">{t('store_intro')}</p></div>
      </div>

      {/* warnings */}
      {phone === '' && (
        <div className="card bg-amber-50 border-amber-200 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
          <div className="flex-1 text-sm text-amber-800">{t('store_need_phone')}</div>
          <button onClick={() => navigate('/settings')} className="btn-secondary py-1 px-3 text-xs">{t('open_settings')}</button>
        </div>
      )}
      {products.length === 0 && (
        <div className="card bg-amber-50 border-amber-200 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
          <div className="flex-1 text-sm text-amber-800">{t('store_need_products')}</div>
          <button onClick={() => navigate('/inventory')} className="btn-secondary py-1 px-3 text-xs">{t('open_inventory')}</button>
        </div>
      )}

      {/* link + actions */}
      <div className="card space-y-3">
        <label className="label">{t('your_store_link')}</label>
        <div className="flex gap-2 flex-wrap">
          <input className="input flex-1 min-w-48" value={link} readOnly />
          <button onClick={copy} className="btn-secondary"><Copy size={15} /> {t('copy_link')}</button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={link} target="_blank" rel="noreferrer" className="btn-primary"><ExternalLink size={15} /> {t('store_open')}</a>
          <button onClick={shareWa} className="btn-secondary text-green-600"><Share2 size={15} /> {t('store_share_wa')}</button>
        </div>
      </div>

      {/* product count */}
      <div className="card flex items-center justify-between">
        <span className="text-gray-500 flex items-center gap-2"><Package size={16} /> {t('store_products_in')}</span>
        <span className="text-2xl font-bold text-primary-700">{products.length}</span>
      </div>

      {/* how it works */}
      <div className="card">
        <h3 className="font-semibold mb-3">{t('store_how')}</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li>{t('store_s1')}</li>
          <li>{t('store_s2')}</li>
          <li>{t('store_s3')}</li>
        </ol>
      </div>
    </div>
  )
}
