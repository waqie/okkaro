import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Upload, X, Eye, EyeOff, Pencil } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

function fileToImg(file, maxW = 1000) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const img = new Image()
      img.onload = () => {
        const s = Math.min(1, maxW / img.width)
        const w = Math.round(img.width * s), h = Math.round(img.height * s)
        const c = document.createElement('canvas'); c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(c.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject; img.src = r.result
    }
    r.onerror = reject; r.readAsDataURL(file)
  })
}

const blank = { title: '', excerpt: '', content: '', cover_base64: '', tags: '', author: 'OKKARO Team', meta_title: '', meta_description: '', published: false }

export default function BlogManager() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState([])
  const [editing, setEditing] = useState(null) // null = list, {} = form
  const [f, setF] = useState(blank)
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/api/blog/posts/').then(r => setPosts(r.data.results || r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  if (!user?.is_superuser) {
    return <div className="card max-w-md"><h1 className="text-xl font-bold">🔒 Owner only</h1><p className="text-gray-500 mt-2">Yeh section sirf OKKARO owner ke liye hai.</p></div>
  }

  const openNew = () => { setF(blank); setEditing('new') }
  const openEdit = async (slug) => {
    try { const r = await api.get(`/api/blog/posts/${slug}/`); setF({ ...blank, ...r.data }); setEditing(slug) }
    catch { toast.error('Load failed') }
  }

  const onCover = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    try { const cover = await fileToImg(file); setF(p => ({ ...p, cover_base64: cover })) } catch { toast.error('Image error') }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!f.title.trim() || !f.content.trim()) { toast.error('Title aur content zaroori hain'); return }
    setSaving(true)
    try {
      if (editing === 'new') await api.post('/api/blog/posts/', f)
      else await api.patch(`/api/blog/posts/${editing}/`, f)
      toast.success('Saved'); setEditing(null); load()
    } catch (err) { toast.error(err.response?.data ? JSON.stringify(err.response.data).slice(0, 120) : 'Error') }
    finally { setSaving(false) }
  }

  const del = async (slug) => {
    if (!confirm('Delete this post?')) return
    try { await api.delete(`/api/blog/posts/${slug}/`); toast.success('Deleted'); load() } catch { toast.error('Error') }
  }

  const togglePublish = async (p) => {
    try { await api.patch(`/api/blog/posts/${p.slug}/`, { published: !p.published }); load() } catch { toast.error('Error') }
  }

  // ---- Form ----
  if (editing) {
    return (
      <form onSubmit={save} className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{editing === 'new' ? 'New Post' : 'Edit Post'}</h1>
          <button type="button" onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <div className="card space-y-4">
          <div><label className="label">Title</label><input className="input" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Why every SME needs digital accounting" /></div>
          <div><label className="label">Excerpt (short summary)</label><input className="input" value={f.excerpt} onChange={e => setF({ ...f, excerpt: e.target.value })} maxLength={300} /></div>
          <div>
            <label className="label">Cover image</label>
            <div className="flex items-center gap-4">
              <div className="w-32 h-20 rounded-lg border bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                {f.cover_base64 ? <img src={f.cover_base64} className="max-w-full max-h-full object-cover" /> : <span className="text-xs text-gray-400">None</span>}
              </div>
              <label className="btn-secondary cursor-pointer"><Upload size={15} /> Upload<input type="file" accept="image/*" className="hidden" onChange={onCover} /></label>
              {f.cover_base64 && <button type="button" onClick={() => setF({ ...f, cover_base64: '' })} className="text-xs text-red-600">Remove</button>}
            </div>
          </div>
          <div><label className="label">Content (Markdown)</label><textarea className="input font-mono text-sm" rows={14} value={f.content} onChange={e => setF({ ...f, content: e.target.value })} placeholder={'## Heading\n\nWrite your article in **Markdown**...'} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Tags (comma-separated)</label><input className="input" value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} placeholder="accounting, sme" /></div>
            <div><label className="label">Author</label><input className="input" value={f.author} onChange={e => setF({ ...f, author: e.target.value })} /></div>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-900">SEO (optional)</h3>
          <div><label className="label">Meta title</label><input className="input" value={f.meta_title} onChange={e => setF({ ...f, meta_title: e.target.value })} placeholder="Defaults to title" /></div>
          <div><label className="label">Meta description</label><input className="input" value={f.meta_description} onChange={e => setF({ ...f, meta_description: e.target.value })} maxLength={300} placeholder="Defaults to excerpt" /></div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={f.published} onChange={e => setF({ ...f, published: e.target.checked })} /> Published (live on /blog)
          </label>
          <button type="submit" disabled={saving} className="btn-primary ms-auto"><Save size={15} /> {saving ? 'Saving…' : 'Save Post'}</button>
        </div>
      </form>
    )
  }

  // ---- List ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Blog Manager</h1><p className="text-gray-500 text-sm mt-1">Marketing blog — sirf owner. Posts <a href="/blog" target="_blank" className="text-primary-600">/blog</a> par dikhte hain.</p></div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> New Post</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Title', 'Status', 'Date', ''].map((h, i) => <th key={i} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${i === 3 ? 'text-end' : 'text-start'}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">No posts yet — create your first.</td></tr>
            ) : posts.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3">
                  <span className={p.published ? 'badge-paid' : 'badge-draft'}>{p.published ? 'Published' : 'Draft'}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.pub_date).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <button onClick={() => togglePublish(p)} title="Toggle publish" className="text-gray-500 hover:text-primary-600">{p.published ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    <button onClick={() => openEdit(p.slug)} className="text-gray-500 hover:text-primary-600"><Pencil size={16} /></button>
                    <button onClick={() => del(p.slug)} className="text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
