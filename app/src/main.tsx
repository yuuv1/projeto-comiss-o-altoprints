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
// O modo autoUpdate aplica a versão nova assim que o service worker a instala;
// as verificações também rodam ao abrir/voltar ao app e a cada 5 minutos online.
// Workbox usa skipWaiting/clientsClaim na config para não exigir limpeza manual do cache.
const origemSegura = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
if (import.meta.env.PROD && origemSegura && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const verificarAtualizacao = () => {
        if (!navigator.onLine || document.visibilityState === 'hidden') return
        void registration.update().catch(() => {
          // Falha temporária de rede: a próxima verificação tenta novamente.
        })
      }
      verificarAtualizacao()
      window.setInterval(verificarAtualizacao, 5 * 60 * 1000)
      window.addEventListener('online', verificarAtualizacao)
      window.addEventListener('focus', verificarAtualizacao)
      window.addEventListener('pageshow', verificarAtualizacao)
      document.addEventListener('visibilitychange', verificarAtualizacao)
    },
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
