import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useT } from '../../i18n'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const { t, lang, toggle, dir } = useT()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.username, form.password)
      toast.success(t('welcome'))
      navigate('/')
    } catch {
      toast.error(t('invalid'))
    } finally { setLoading(false) }
  }

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-end mb-3">
          <button onClick={toggle}
            className="flex items-center gap-1.5 text-sm text-primary-200 hover:text-white border border-primary-700 rounded-lg px-3 py-1.5">
            <Globe size={15} /> {lang === 'ur' ? 'English' : 'اردو'}
          </button>
        </div>

        <div className="text-center mb-8">
          <img src="/okkaro-logo-white.png" alt="OKKARO" className="h-12 w-auto mx-auto mb-4" />
          <p className="text-primary-300 mt-1">{t('tagline')}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('signin_title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('username')}</label>
              <input type="text" className="input" placeholder={t('enter_username')}
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div>
              <label className="label">{t('password')}</label>
              <input type="password" className="input" placeholder={t('enter_password')}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-60">
              {loading ? t('signing_in') : t('signin_btn')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            {t('no_account')} <a href="/register" className="text-primary-600 font-medium">{t('start_trial')}</a>
          </p>
        </div>
      </div>
    </div>
  )
}
