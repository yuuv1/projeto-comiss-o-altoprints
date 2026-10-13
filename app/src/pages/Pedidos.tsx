import { ClipboardList, Package, Pencil, Plus, Store, Trash2, Truck, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { BarraBusca, Botao, CartaoResumo, TituloPagina, Vazio, cn } from '../components/ui'
import { useAuth } from '../lib/auth'
import { moeda } from '../lib/format'
import { useStore } from '../lib/store'
import { pedidoPendenteFinanceiro, podeEditarPedidos, podeExcluirPedidos } from '../lib/types'

export default function Pedidos() {
  const { db } = useStore()
  const { usuario, ehProprietario } = useAuth()
  const acoes = useAcoesPedido()
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')

  // o vendedor enxerga apenas os pedidos dele
  const meus = useMemo(
    () =>
      ehProprietario
        ? db.pedidos
        : db.pedidos.filter((p) => p.vendedor_id === usuario?.vendedor_id),
    [db.pedidos, ehProprietario, usuario?.vendedor_id],
  )

  const permissao = db.configuracoes.permissao_vendedor
  const podeEditar = ehProprietario || podeEditarPedidos(permissao)
  const podeExcluir = ehProprietario || podeExcluirPedidos(permissao)

  const pedidos = useMemo(() => [...meus].sort((a, b) => b.numero - a.numero), [meus])

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
        titulo={ehProprietario ? 'Pedidos' : 'Meus pedidos'}
        subtitulo={
          ehProprietario
            ? 'Gerencie a montagem da arte, impressão, envio e pagamento.'
            : 'Aqui aparecem somente os seus pedidos.'
        }
        acoes={
          <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
            Novo pedido
          </Botao>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        className="mb-3"
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
          titulo={busca ? 'Nenhum pedido encontrado' : ehProprietario ? 'Nenhum pedido cadastrado ainda' : 'Você ainda não tem pedidos'}
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
                  <Botao
                    tamanho="sm"
                    variante="secundario"
                    icone={Pencil}
                    onClick={() => acoes.editar(p)}
                  >
                    {podeEditar ? 'Editar' : 'Ver'}
                  </Botao>
                  {podeExcluir ? (
                    <Botao
                      tamanho="sm"
                      variante="ghost"
                      className="text-rose-500 hover:bg-rose-50"
                      icone={Trash2}
                      onClick={() => acoes.pedirExclusao(p)}
                    >
                      Excluir
                    </Botao>
                  ) : null}
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
