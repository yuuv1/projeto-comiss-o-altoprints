import { ClipboardList, Package, Pencil, Plus, Store, Trash2, Truck, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { BarraBusca, Botao, CartaoResumo, TituloPagina, Vazio, cn } from '../components/ui'
import { moeda } from '../lib/format'
import { useStore } from '../lib/store'
import { pedidoPendenteFinanceiro } from '../lib/types'

export default function Pedidos() {
  const { db } = useStore()
  const acoes = useAcoesPedido()
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')

  const pedidos = useMemo(
    () => [...db.pedidos].sort((a, b) => b.numero - a.numero),
    [db.pedidos],
  )

  const resumo = useMemo(() => {
    const retirada = pedidos.filter((p) => p.tipo_entrega === 'retirada').length
    const correios = pedidos.filter((p) => p.tipo_entrega === 'correios').length
    const aReceber = pedidos.filter(pedidoPendenteFinanceiro).reduce((s, p) => s + Number(p.valor || 0), 0)
    return { total: pedidos.length, retirada, correios, aReceber }
  }, [pedidos])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return pedidos
    return pedidos.filter((p) =>
      [p.cliente_nome, String(p.numero), `#${p.numero}`, p.descricao, p.cidade, p.codigo_rastreio, p.observacoes]
        .join(' ')
        .toLowerCase()
        .includes(t),
    )
  }, [busca, pedidos])

  return (
    <>
      <TituloPagina
        icone={ClipboardList}
        titulo="Pedidos"
        subtitulo="Gerencie a montagem da arte, impressão, envio e pagamento."
        acoes={
          <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
            Novo pedido
          </Botao>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo
          titulo="Total de pedidos"
          valor={resumo.total}
          icone={Package}
          gradiente="from-pink-500 to-purple-600"
        />
        <CartaoResumo
          titulo="Retirada"
          valor={resumo.retirada}
          icone={Store}
          gradiente="from-violet-500 to-indigo-600"
        />
        <CartaoResumo titulo="Correios" valor={resumo.correios} icone={Truck} gradiente="from-sky-500 to-blue-600" />
        <CartaoResumo
          titulo="A receber"
          valor={moeda(resumo.aReceber)}
          icone={Wallet}
          gradiente="from-amber-500 to-orange-600"
        />
      </div>

      <BarraBusca
        className="mb-5"
        valor={busca}
        onChange={setBusca}
        placeholder="Buscar por cliente, nº do pedido, descrição, cidade ou código de rastreio..."
      />

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">
          {filtrados.length} pedido{filtrados.length === 1 ? '' : 's'}
          {busca ? ' encontrado(s)' : ''}
        </p>
      </div>

      {filtrados.length === 0 ? (
        <Vazio
          icone={Package}
          titulo={busca ? 'Nenhum pedido encontrado' : 'Nenhum pedido cadastrado ainda'}
          descricao={busca ? 'Tente buscar por outro termo.' : 'Comece criando o primeiro pedido.'}
          acao={
            !busca ? (
              <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
                Novo pedido
              </Botao>
            ) : undefined
          }
        />
      ) : (
        <div className={cn('space-y-3', 'animate-fade-in-up')}>
          {filtrados.map((p) => (
            <PedidoCartao
              key={p.id}
              pedido={p}
              acoes={
                <>
                  <Botao tamanho="sm" variante="secundario" icone={Pencil} onClick={() => acoes.editar(p)}>
                    Editar
                  </Botao>
                  <Botao
                    tamanho="sm"
                    variante="ghost"
                    className="text-rose-500 hover:bg-rose-50"
                    icone={Trash2}
                    onClick={() => acoes.pedirExclusao(p)}
                  >
                    Excluir
                  </Botao>
                </>
              }
            />
          ))}
        </div>
      )}
      {acoes.dialog}
    </>
  )
}
