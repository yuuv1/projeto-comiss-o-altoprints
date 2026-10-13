import { CheckCircle2, ClipboardList, PackageCheck, Pencil, Plus, RotateCcw, Trash2, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { PassosFila } from '../components/StatusBadges'
import { BarraBusca, Botao, CartaoResumo, Pilulas, TituloPagina, Vazio, cn } from '../components/ui'
import { useAuth } from '../lib/auth'
import { telasDoUsuario } from '../lib/types'
import { moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import {
  combinaFiltro,
  FILTROS_FILA,
  type FiltroFila,
  type PassoFila,
  type Pedido,
  podeEditarPedidos,
  podeExcluirPedidos,
} from '../lib/types'

/**
 * Pedidos — as filas de impressão.
 *
 * A pessoa registra a fila (cliente + metragem, com o valor já calculado) e
 * depois vai clicando nos passos: pago → imprimindo → concluída → entregue.
 * Os filtros separam cada etapa; "Todas" mostra tudo.
 */
export default function Pedidos() {
  const { db } = useStore()
  const { usuario, ehProprietario } = useAuth()
  const acoes = useAcoesPedido()
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')
  // dá para chegar já filtrado: /pedidos?filtro=a_imprimir
  const [parametros] = useSearchParams()
  const [filtro, setFiltro] = useState<FiltroFila>(() => {
    const pedido = parametros.get('filtro')
    return FILTROS_FILA.some((f) => f.id === pedido) ? (pedido as FiltroFila) : 'todas'
  })

  /** quem cuida da produção (fila de impressão) enxerga todas as filas */
  const veTodas = ehProprietario || telasDoUsuario(usuario).paraImprimir

  // o vendedor enxerga apenas as filas dele
  const meus = useMemo(
    () => (veTodas ? db.pedidos : db.pedidos.filter((p) => p.vendedor_id === usuario?.vendedor_id)),
    [db.pedidos, usuario?.vendedor_id, veTodas],
  )

  const permissao = db.configuracoes.permissao_vendedor
  const podeEditar = ehProprietario || podeEditarPedidos(permissao)
  const podeExcluir = ehProprietario || podeExcluirPedidos(permissao)

  const pedidos = useMemo(() => [...meus].sort((a, b) => b.numero - a.numero), [meus])

  const contagem = useMemo(
    () => Object.fromEntries(FILTROS_FILA.map((f) => [f.id, pedidos.filter((p) => combinaFiltro(p, f.id)).length])),
    [pedidos],
  ) as Record<FiltroFila, number>

  const daEtapa = useMemo(() => pedidos.filter((p) => combinaFiltro(p, filtro)), [filtro, pedidos])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return daEtapa
    return daEtapa.filter((p) =>
      [p.cliente_nome, String(p.numero), `#${p.numero}`, p.descricao, p.cidade, p.observacoes]
        .join(' ')
        .toLowerCase()
        .includes(t),
    )
  }, [busca, daEtapa])

  const resumo = useMemo(
    () => ({
      metragem: daEtapa.reduce((s, p) => s + Number(p.metragem || 0), 0),
      valor: daEtapa.reduce((s, p) => s + Number(p.valor || 0), 0),
    }),
    [daEtapa],
  )

  /** dispara a ação sem deixar erro solto (o aviso do modo visualização já aparece) */
  const disparar = (promessa: Promise<unknown>) => {
    void promessa.catch(() => {})
  }

  /** clique nos passos da fila: pago → imprimindo → concluída → entregue */
  const aoPasso = (p: Pedido, passo: PassoFila) => {
    disparar(acoes.alternarPasso(p, passo))
  }

  const ajuda = FILTROS_FILA.find((f) => f.id === filtro)?.ajuda ?? ''

  const acoesDoCartao = (p: Pedido) => (
    <>
      <Botao tamanho="sm" variante="secundario" icone={Pencil} onClick={() => acoes.editar(p)}>
        {podeEditar ? 'Editar' : 'Ver'}
      </Botao>
      {podeExcluir ? (
        <Botao
          tamanho="sm"
          variante="ghost"
          className="text-rose-500 hover:bg-rose-50"
          icone={Trash2}
          onClick={() => disparar(acoes.pedirExclusao(p))}
        >
          Excluir
        </Botao>
      ) : null}
    </>
  )

  return (
    <>
      <TituloPagina
        icone={ClipboardList}
        titulo={ehProprietario ? 'Pedidos' : 'Meus pedidos'}
        subtitulo="Cada pedido é uma fila de impressão: cliente, metragem, valor automático e os passos até a entrega."
        acoes={
          <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
            Registrar fila
          </Botao>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo
          titulo="Em andamento"
          valor={contagem.a_imprimir + contagem.imprimindo}
          icone={RotateCcw}
          gradiente="from-sky-500 to-blue-600"
          sub={`${contagem.imprimindo} imprimindo`}
        />
        <CartaoResumo titulo="A pagar" valor={contagem.a_pagar} icone={Wallet} gradiente="from-amber-500 to-orange-600" />
        <CartaoResumo titulo="Concluídas" valor={contagem.concluida} icone={CheckCircle2} gradiente="from-emerald-500 to-green-600" />
        <CartaoResumo titulo="Entregues" valor={contagem.entregue} icone={PackageCheck} gradiente="from-violet-500 to-indigo-600" />
      </div>

      <Pilulas<FiltroFila>
        className="mb-3"
        ativo={filtro}
        onChange={setFiltro}
        itens={FILTROS_FILA.map((f) => ({ id: f.id, label: f.label, contador: contagem[f.id] }))}
      />

      <BarraBusca
        className="mb-3"
        valor={busca}
        onChange={setBusca}
        placeholder="Buscar por cliente, nº da fila, descrição ou cidade..."
      />

      <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {ajuda} {filtrados.length} fila{filtrados.length === 1 ? '' : 's'}
        {busca ? ' encontrada(s)' : ''} • {numeroBR(resumo.metragem)} m • {moeda(resumo.valor)}
      </p>

      {filtrados.length === 0 ? (
        <Vazio
          icone={filtro === 'entregue' ? PackageCheck : ClipboardList}
          titulo={
            busca
              ? 'Nenhuma fila encontrada'
              : filtro === 'todas'
                ? ehProprietario
                  ? 'Nenhuma fila registrada ainda'
                  : 'Você ainda não registrou filas'
                : 'Nada por aqui'
          }
          descricao={busca ? 'Tente buscar por outro termo.' : ajuda}
          acao={
            !busca && filtro === 'todas' ? (
              <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
                Registrar fila
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
              mostrarVendedor={veTodas}
              mostrarValor={ehProprietario || p.vendedor_id === usuario?.vendedor_id}
              extras={<PassosFila pedido={p} onPasso={(passo) => aoPasso(p, passo)} />}
              acoes={acoesDoCartao(p)}
            />
          ))}
        </div>
      )}

      {acoes.dialog}
    </>
  )
}
