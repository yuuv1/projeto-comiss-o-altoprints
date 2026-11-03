import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './lib/auth'
import { StoreProvider } from './lib/store'
import { prepararAparicao } from './lib/tema'

// O arquivo Altoprints.html (file://) é uma demonstração local, não um PWA.
// O service worker só é ativado no site hospedado em HTTPS ou localhost.
const origemSegura = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
if (import.meta.env.PROD && origemSegura && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.warn('[Altoprints] Não foi possível ativar o modo instalável:', error)
    },
  })
}

// aplica tema e densidade salvos antes da primeira pintura
prepararAparicao()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <StoreProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StoreProvider>
    </HashRouter>
  </React.StrictMode>,
)
