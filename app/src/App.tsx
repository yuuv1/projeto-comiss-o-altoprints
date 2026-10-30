import { AlertTriangle, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ROTA_ADMIN, useAtalhoAdmin } from './lib/admin'
import { Layout } from './components/Layout'
import { Toaster, Vazio } from './components/ui'
import { useAuth } from './lib/auth'
import { useStore } from './lib/store'
import Administracao from './pages/Administracao'
import Clientes from './pages/Clientes'
import Configuracoes from './pages/Configuracoes'
import Equipe from './pages/Equipe'
import Painel from './pages/Painel'
import PedidoForm from './pages/PedidoForm'
import Pedidos from './pages/Pedidos'
import Relatorio from './pages/Relatorio'
import RelatorioResumo from './pages/RelatorioResumo'
import RelatorioClienteEspecial from './pages/RelatorioClienteEspecial'

function AvisoErro() {
  const { erro, limparErro } = useStore()
  if (!erro) return null
  return (
    <div className="mx-auto mb-4 flex max-w-7xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 print:hidden dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="font-bold">Ocorreu um problema</p>
        <p>{erro}</p>
      </div>
      <button onClick={limparErro} className="rounded-lg px-2 py-1 font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40">
        fechar
      </button>
    </div>
  )
}

function Carregando() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 bg-gradient-to-b from-fuchsia-50 to-sky-50 text-slate-500 dark:from-slate-950 dark:to-slate-900 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" />
      <span className="text-sm font-semibold">Carregando o sistema...</span>
    </div>
  )
}

/** telas que só o proprietário abre; para a equipe, mostra o convite ao login */
function SoDono({ children }: { children: React.ReactNode }) {
  const { ehProprietario, carregando } = useAuth()
  const navegar = useNavigate()
  if (carregando) return <Carregando />
  if (ehProprietario) return <>{children}</>
  return (
    <Vazio
      icone={ShieldAlert}
      titulo="Esta área é do proprietário"
      descricao="Pedidos, clientes e o seu dia a dia ficam na tela Pedidos. Para abrir esta área, entre com o login do proprietário."
      acao={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => navegar(ROTA_ADMIN)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-soft"
          >
            <LockKeyhole className="h-4 w-4" /> Login proprietário
          </button>
          <button
            onClick={() => navegar('/pedidos')}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Voltar aos pedidos
          </button>
        </div>
      }
    />
  )
}

/** a raiz do sistema: o dono cai no Painel; a equipe cai nos Pedidos */
function Inicio() {
  const { ehProprietario, carregando } = useAuth()
  if (carregando) return <Carregando />
  return ehProprietario ? <Painel /> : <Pedidos />
}

export default function App() {
  const navegar = useNavigate()
  const { carregando } = useAuth()

  // atalho do proprietário no teclado: Ctrl + Alt + D
  useAtalhoAdmin(() => navegar(ROTA_ADMIN))

  if (carregando) return <Carregando />

  return (
    <>
      <AvisoErro />
      <Routes>
        {/* não existe mais login de funcionário: /login volta para os pedidos */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/administracao" element={<Administracao />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/pedido/novo" element={<PedidoForm />} />
          <Route path="/pedido/:id" element={<PedidoForm />} />
          <Route path="/clientes" element={<Clientes />} />
          {/* a fila de impressão virou um filtro dentro de Pedidos */}
          <Route path="/para-imprimir" element={<Navigate to="/pedidos" replace />} />
          {/* funcionários são cadastrados dentro da tela do proprietário */}
          <Route path="/vendedores" element={<Navigate to="/equipe" replace />} />
          <Route path="/por-vendedor" element={<Navigate to="/relatorio" replace />} />

          <Route
            path="/relatorio"
            element={
              <SoDono>
                <Relatorio />
              </SoDono>
            }
          />
          <Route
            path="/relatorio-resumo"
            element={
              <SoDono>
                <RelatorioResumo />
              </SoDono>
            }
          />
          <Route
            path="/relatorio-cliente-especial"
            element={
              <SoDono>
                <RelatorioClienteEspecial />
              </SoDono>
            }
          />
          <Route
            path="/equipe"
            element={
              <SoDono>
                <Equipe />
              </SoDono>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <SoDono>
                <Configuracoes />
              </SoDono>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}
