import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Users, MessageCircle, Download, Upload } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import { openWhatsApp } from '../../utils/whatsapp'
import { exportCSV, parseCSV } from '../../utils/exporter'

export default function Parties() {
  const { t } = useT()
  const [parties, setParties] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', party_type: 'customer', phone: '', email: '', city: '', opening_balance: 0 })

  const fetchParties = () => {
    const params = search ? `?search=${search}` : ''
    api.get(`/api/invoicing/parties/${params}`).then(r => setParties(r.data.results || r.data)).catch(() => {})
  }

  useEffect(() => { fetchParties() }, [search])

  const fileRef = useRef(null)
  const importFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const rows = parseCSV(text)
    let n = 0
    for (const r of rows) {
      const name = r.name || r['full name'] || r.naam
      if (!name) continue
      try {
        await api.post('/api/invoicing/parties/', {
          name, phone: r.phone || '', city: r.city || '',
          party_type: (r.type || r.party_type || 'customer').toLowerCase().includes('vend') ? 'vendor' : 'customer',
        })
        n++
      } catch { /* skip bad row */ }
    }
    toast.success(`${n} ${t('import_done')}`)
    e.target.value = ''
    fetchParties()
  }

  const typeLabel = (ty) => ({ customer: t('p_customer'), vendor: t('p_vendor'), both: t('p_both') }[ty] || ty)

  const messageParty = (p) => {
    if (!p.phone) { toast(t('no_phone')); return }
    openWhatsApp(p.phone, `${t('wa_hello')} ${p.name}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/invoicing/parties/', form)
      toast.success(t('party_added'))
      setShowForm(false)
      setForm({ name: '', party_type: 'customer', phone: '', email: '', city: '', opening_balance: 0 })
      fetchParties()
    } catch { toast.error(t('party_failed')) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('parties')}</h1><p className="text-gray-500 text-sm mt-1">{t('parties_subtitle')}</p></div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={importFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary"><Upload size={15} /> {t('import_excel')}</button>
          <button onClick={() => exportCSV('parties.csv', parties, [
            { key: 'name', label: 'Name' }, { key: 'party_type', label: 'Type' },
            { key: 'phone', label: 'Phone' }, { key: 'city', label: 'City' },
            { key: 'current_balance', label: 'Balance' }])} className="btn-secondary">
            <Download size={15} /> {t('export_excel')}
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> {t('add_party')}</button>
        </div>
      </div>

      <div className="card flex gap-3 p-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input ps-9" placeholder={t('search_parties')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('th_name'), t('th_type'), t('th_phone'), t('th_city'), t('th_balance'), t('th_actions')].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {parties.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400"><Users size={40} className="mx-auto mb-2 opacity-30" />{t('no_parties')}</td></tr>
            ) : parties.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.party_type === 'customer' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{typeLabel(p.party_type)}</span></td>
                <td className="px-4 py-3 text-gray-500">{p.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{p.city || '—'}</td>
                <td className={`px-4 py-3 font-semibold ${p.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Rs. {Number(p.current_balance || 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button title={t('say_hi_whatsapp')} onClick={() => messageParty(p)}
                    className="p-1.5 hover:bg-green-50 rounded text-green-600"><MessageCircle size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('add_party')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">{t('full_name')}</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><label className="label">{t('type_label')}</label>
                <select className="input" value={form.party_type} onChange={e => setForm({...form, party_type: e.target.value})}>
                  <option value="customer">{t('p_customer')}</option><option value="vendor">{t('p_vendor')}</option><option value="both">{t('p_both')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t('phone_label')}</label><input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div><label className="label">{t('city_label')}</label><input className="input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
              </div>
              <div><label className="label">{t('opening_balance')}</label><input type="number" className="input" value={form.opening_balance} onChange={e => setForm({...form, opening_balance: e.target.value})} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">{t('add_party')}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
