import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ROTA_ADMIN, useAtalhoAdmin } from './lib/admin'
import { Layout } from './components/Layout'
import { Toaster, Vazio } from './components/ui'
import { useAuth } from './lib/auth'
import { useStore } from './lib/store'
import { LABEL_TELA, telasDoUsuario, type TelasAcesso } from './lib/types'
import Administracao from './pages/Administracao'
import Clientes from './pages/Clientes'
import Configuracoes from './pages/Configuracoes'
import Equipe from './pages/Equipe'
import Login from './pages/Login'
import MinhaArea from './pages/MinhaArea'
import Painel from './pages/Painel'
import PedidoForm from './pages/PedidoForm'
import Pedidos from './pages/Pedidos'
import Relatorio from './pages/Relatorio'
import RelatorioResumo from './pages/RelatorioResumo'
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

function Bloqueado({ titulo, descricao }: { titulo: string; descricao: string }) {
  const navegar = useNavigate()
  return (
    <Vazio
      icone={ShieldAlert}
      titulo={titulo}
      descricao={descricao}
      acao={
        <button
          onClick={() => navegar('/')}
          className="rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-soft"
        >
          Voltar para o início
        </button>
      }
    />
  )
}

/** telas que só o proprietário acessa */
function SoDono({ children }: { children: React.ReactNode }) {
  const { ehProprietario } = useAuth()
  if (ehProprietario) return <>{children}</>
  return (
    <Bloqueado
      titulo="Esta área é do proprietário"
      descricao="Seus pedidos e a sua comissão ficam em Minha área."
    />
  )
}

/** telas que o proprietário pode liberar para um vendedor (Equipe → Opções de relatórios) */
function Permitido({ tela, children }: { tela: keyof TelasAcesso; children: React.ReactNode }) {
  const { ehProprietario, usuario } = useAuth()
  if (ehProprietario || telasDoUsuario(usuario)[tela]) return <>{children}</>
  return (
    <Bloqueado
      titulo="Esta tela não está liberada para o seu acesso"
      descricao={`Peça ao proprietário para liberar "${LABEL_TELA[tela]}" na tela Equipe.`}
    />
  )
}

function Inicio() {
  const { ehProprietario } = useAuth()
  return ehProprietario ? <Painel /> : <MinhaArea />
}

export default function App() {
  const navegar = useNavigate()

  // atalho do proprietário no teclado: Ctrl + Alt + D
  useAtalhoAdmin(() => navegar(ROTA_ADMIN))

  return (
    <>
      <AvisoErro />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/administracao" element={<Administracao />} />
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
          {/* a fila de impressão virou um filtro dentro de Pedidos */}
          <Route path="/para-imprimir" element={<Navigate to="/pedidos" replace />} />

          <Route path="/por-vendedor" element={<Navigate to="/relatorio" replace />} />
          <Route
            path="/relatorio"
            element={
              <Permitido tela="relatorio">
                <Relatorio />
              </Permitido>
            }
          />
          <Route
            path="/relatorio-resumo"
            element={
              <Permitido tela="relatorio">
                <RelatorioResumo />
              </Permitido>
            }
          />
          <Route
            path="/relatorio-cliente-especial"
            element={
              <Permitido tela="clienteEspecial">
                <RelatorioClienteEspecial />
              </Permitido>
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
