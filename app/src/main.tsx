import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './lib/auth'
import { StoreProvider } from './lib/store'
import { prepararAparicao } from './lib/tema'

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
