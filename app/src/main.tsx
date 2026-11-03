import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './lib/auth'
import { StoreProvider } from './lib/store'
import { prepararAparicao } from './lib/tema'

// O app oficial funciona no site HTTPS e usa somente o banco Supabase central.
// O service worker só é ativado no site hospedado em HTTPS ou localhost.
// O modo autoUpdate aplica a versão nova assim que o service worker a instala;
// as verificações também rodam ao abrir/voltar ao app e a cada 5 minutos online.
// Workbox usa skipWaiting/clientsClaim na config para não exigir limpeza manual do cache.
const origemSegura = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
if (import.meta.env.PROD && origemSegura && 'serviceWorker' in navigator) {
  let recarregando = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregando) return
    recarregando = true
    window.location.reload()
  })

  const checarBundleMaisNovo = async () => {
    try {
      if (!navigator.onLine) return
      const scriptAtual = document.querySelector('script[type="module"][src*="index-"]')?.getAttribute('src')
      if (!scriptAtual) return
      const resp = await fetch(`./index.html?_t=${Date.now()}`, { cache: 'no-store' })
      if (!resp.ok) return
      const html = await resp.text()
      if (!html.includes(scriptAtual) && /index-[A-Za-z0-9_-]+\.js/.test(html)) {
        if ('caches' in window) {
          const chaves = await caches.keys()
          await Promise.all(chaves.map((k) => caches.delete(k)))
        }
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.update()))
        if (!recarregando) {
          recarregando = true
          window.location.reload()
        }
      }
    } catch {
      // ignora falha temporária de rede
    }
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const verificarAtualizacao = () => {
        if (!navigator.onLine || document.visibilityState === 'hidden') return
        void registration.update().catch(() => {
          // Falha temporária de rede: a próxima verificação tenta novamente.
        })
        void checarBundleMaisNovo()
      }
      verificarAtualizacao()
      window.setInterval(verificarAtualizacao, 2 * 60 * 1000)
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
