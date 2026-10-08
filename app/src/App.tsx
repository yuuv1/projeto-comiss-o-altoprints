import { AlertTriangle, WifiOff } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Toaster } from './components/ui'
import { useStore } from './lib/store'
import Clientes from './pages/Clientes'
import Entregas from './pages/Entregas'
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
    <div className="mx-auto mb-4 flex max-w-7xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 print:hidden">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="font-bold">Ocorreu um problema</p>
        <p>{erro}</p>
      </div>
      <button onClick={limparErro} className="rounded-lg px-2 py-1 font-semibold hover:bg-rose-100">
        fechar
      </button>
    </div>
  )
}

export default function App() {
  const { carregando } = useStore()

  return (
    <>
      <AvisoErro />
      {carregando ? (
        <div className="flex min-h-screen items-center justify-center gap-3 bg-gradient-to-b from-fuchsia-50 to-sky-50 text-slate-500">
          <WifiOff className="h-5 w-5 animate-pulse text-purple-600" />
          <span className="text-sm font-semibold">Carregando o sistema...</span>
        </div>
      ) : (
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Pedidos />} />
            <Route path="/pedido/novo" element={<PedidoForm />} />
            <Route path="/pedido/:id" element={<PedidoForm />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/vendedores" element={<Vendedores />} />
            <Route path="/por-vendedor" element={<PorVendedor />} />
            <Route path="/para-imprimir" element={<ParaImprimir />} />
            <Route path="/entregas" element={<Entregas />} />
            <Route path="/relatorio" element={<Relatorio />} />
            <Route path="/relatorio-cliente-especial" element={<RelatorioClienteEspecial />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
      <Toaster />
    </>
  )
}
