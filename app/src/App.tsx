import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Toaster, Vazio } from './components/ui'
import { useAuth } from './lib/auth'
import { useStore } from './lib/store'
import Clientes from './pages/Clientes'
import Configuracoes from './pages/Configuracoes'
import Entregas from './pages/Entregas'
import Equipe from './pages/Equipe'
import Login from './pages/Login'
import MinhaArea from './pages/MinhaArea'
import Painel from './pages/Painel'
import ParaImprimir from './pages/ParaImprimir'
import PedidoForm from './pages/PedidoForm'
import Pedidos from './pages/Pedidos'
import PorVendedor from './pages/PorVendedor'
import Relatorio from './pages/Relatorio'
import RelatorioClienteEspecial from './pages/RelatorioClienteEspecial'
import Vendedores from './pages/Vendedores'

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

/** exige login */
function Protegido({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (!usuario) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** telas que só o proprietário acessa */
function SoDono({ children }: { children: React.ReactNode }) {
  const { ehProprietario } = useAuth()
  const navegar = useNavigate()
  if (ehProprietario) return <>{children}</>
  return (
    <Vazio
      icone={ShieldAlert}
      titulo="Esta área é do proprietário"
      descricao="Seus pedidos e a sua comissão ficam em Minha área."
      acao={
        <button
          onClick={() => navegar('/')}
          className="rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-soft"
        >
          Ir para Minha área
        </button>
      }
    />
  )
}

function Inicio() {
  const { ehProprietario } = useAuth()
  return ehProprietario ? <Painel /> : <MinhaArea />
}

export default function App() {
  return (
    <>
      <AvisoErro />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protegido>
              <Layout />
            </Protegido>
          }
        >
          <Route path="/" element={<Inicio />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/pedido/novo" element={<PedidoForm />} />
          <Route path="/pedido/:id" element={<PedidoForm />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/vendedores" element={<Vendedores />} />
          <Route path="/por-vendedor" element={<PorVendedor />} />
          <Route
            path="/para-imprimir"
            element={
              <SoDono>
                <ParaImprimir />
              </SoDono>
            }
          />
          <Route
            path="/entregas"
            element={
              <SoDono>
                <Entregas />
              </SoDono>
            }
          />
          <Route
            path="/relatorio"
            element={
              <SoDono>
                <Relatorio />
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
