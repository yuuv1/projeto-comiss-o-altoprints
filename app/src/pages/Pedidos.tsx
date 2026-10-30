import { CheckCircle2, ClipboardList, Filter, PackageCheck, Pencil, Plus, RotateCcw, Trash2, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { BarraBusca, Botao, CartaoResumo, Pilulas, TituloPagina, Vazio, cn } from '../components/ui'
import { useAuth } from '../lib/auth'
import { moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import { combinaFiltro, FILTROS_FILA, type FiltroFila, type PassoFila, type Pedido } from '../lib/types'

/**
 * Pedidos — as filas de impressão.
 *
 * A pessoa registra a fila (cliente + metragem, com o valor já calculado) e
 * depois vai clicando nos passos: pago → imprimindo → concluída → entregue.
 * Os filtros separam cada etapa; "Todas" mostra tudo.
 */
export default function Pedidos() {
  const { db, nomeVendedor } = useStore()
  const { ehProprietario } = useAuth()
  const acoes = useAcoesPedido()
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')
  // dá para chegar já filtrado: /pedidos?filtro=a_imprimir ou /pedidos?vendedor=<id>
  const [parametros, setParametros] = useSearchParams()
  const vendedorFiltro = parametros.get('vendedor') ?? ''
  const [filtro, setFiltro] = useState<FiltroFila>(() => {
    const pedido = parametros.get('filtro')
    return FILTROS_FILA.some((f) => f.id === pedido) ? (pedido as FiltroFila) : 'todas'
  })

  /** tira o filtro de vendedor da barra de endereço (volta a ver todo mundo) */
  const limparVendedor = () => {
    const novos = new URLSearchParams(parametros)
    novos.delete('vendedor')
    setParametros(novos, { replace: true })
  }

  /*
   * A equipe vê o quadro inteiro de filas (é uma loja só, sem login de
   * funcionário). Excluir pedido continua sendo recurso do proprietário.
   */
  const meus = useMemo(() => {
    const base = db.pedidos
    return vendedorFiltro ? base.filter((p) => p.vendedor_id === vendedorFiltro) : base
  }, [db.pedidos, vendedorFiltro])

  const podeEditar = true
  const podeExcluir = ehProprietario

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
        titulo="Pedidos"
        subtitulo="Cada pedido é uma fila de impressão: cliente, metragem, valor automático e os dois estágios — em andamento e concluído."
        acoes={
          <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
            Registrar fila
          </Botao>
        }
      />

      {!ehProprietario ? (
        <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          Você está usando o sistema <b>sem login</b>. Ao registrar uma fila, escolha o <b>seu nome</b> — ele fica
          gravado no pedido e entra no relatório de comissão.
        </p>
      ) : null}

      {vendedorFiltro ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-800 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200">
          <Filter className="h-4 w-4" />
          Mostrando só os pedidos de <b>{nomeVendedor(vendedorFiltro)}</b>
          <button
            onClick={limparVendedor}
            className="ml-auto rounded-lg border border-purple-300 bg-white px-2 py-1 text-[11px] font-bold text-purple-700 transition hover:bg-purple-100 dark:border-purple-800 dark:bg-slate-900 dark:text-purple-300"
          >
            Ver todos os vendedores
          </button>
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo
          titulo="Em andamento"
          valor={contagem.em_andamento}
          icone={RotateCcw}
          gradiente="from-sky-500 to-blue-600"
          sub="ainda na máquina"
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
          titulo={busca ? 'Nenhuma fila encontrada' : filtro === 'todas' ? 'Nenhuma fila registrada ainda' : 'Nada por aqui'}
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
              mostrarVendedor
              mostrarValor
              onPasso={(passo) => aoPasso(p, passo)}
              acoes={acoesDoCartao(p)}
            />
          ))}
        </div>
      )}

      {acoes.dialog}
    </>
  )
}
