import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

// Register service worker (PWA) with AUTO-UPDATE:
// when a new version is deployed, the new SW takes control and the page
// reloads once automatically — no manual cache clear needed.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const hadController = !!navigator.serviceWorker.controller
      const reg = await navigator.serviceWorker.register('/sw.js')
      reg.update().catch(() => {})
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)

      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // only auto-reload on an UPDATE (not the very first install)
        if (refreshing || !hadController) return
        refreshing = true
        window.location.reload()
      })
    } catch (e) { /* ignore */ }
  })
}
