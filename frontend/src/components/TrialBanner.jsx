import { useAuthStore } from '../store/authStore'

const WA = '923399111165'
const upgradeLink = (biz) =>
  `https://wa.me/${WA}?text=${encodeURIComponent(`Assalam o Alaikum! Main OKKARO trial upgrade karna chahta hoon. Business: ${biz?.business_name || ''}`)}`

// Thin countdown banner shown during an active trial.
export default function TrialBanner() {
  const { business, user } = useAuthStore()
  if (!business || user?.is_superuser) return null
  if (business.status !== 'trial' || business.trial_expired) return null
  const d = business.trial_days_left
  if (d == null) return null
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-4 py-2 text-center">
      Free trial: <b>{d} {d === 1 ? 'day' : 'days'} left</b>.{' '}
      <a href={upgradeLink(business)} target="_blank" rel="noreferrer" className="underline font-semibold hover:text-amber-900">
        Upgrade on WhatsApp
      </a>
    </div>
  )
}

// Full-screen block shown once the trial has expired (non-owner users).
export function UpgradeWall() {
  const { business, logout } = useAuthStore()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="card max-w-md text-center">
        <img src="/okkaro-mark.png" alt="OKKARO" className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Your free trial has ended</h1>
        <p className="text-gray-500 mt-2">
          Your 7-day free trial of OKKARO is over. Upgrade to a paid plan to keep using your account — all your data is safe.
        </p>
        <a href={upgradeLink(business)} target="_blank" rel="noreferrer"
          className="btn-primary w-full justify-center mt-6">Upgrade on WhatsApp</a>
        <button onClick={() => { logout(); window.location.href = '/login' }}
          className="text-sm text-gray-400 mt-4 hover:text-gray-600">Sign out</button>
      </div>
    </div>
  )
}
