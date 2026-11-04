import {
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Percent,
  Printer,
  Receipt,
  RotateCcw,
  Ruler,
  Search,
  Undo2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { LogoImpressao } from '../components/Logo'
import {
  BarraAcoes,
  Botao,
  Campo,
  Cartao,
  CartaoResumo,
  Entrada,
  Selecao,
  TituloPagina,
  Vazio,
  cn,
} from '../components/ui'
import {
  calcularComissao,
  comissaoDoPedido,
  comissaoPorVendedor,
  regraDoPedido,
  regrasDaConfig,
  valorDoMetroPedido,
} from '../lib/comissao'
import { baixarCSV } from '../lib/csv'
import { vendedoresAtivosAtual, vendedoresDoPeriodo } from '../lib/equipe-inicial'
import { dataBR, hojeISO, moeda, numeroBR, parseData, percentualBR } from '../lib/format'
import { useStore } from '../lib/store'
import { imprimirDocumento } from '../lib/tema'
import { filasDaComissao, rotuloTipoDtf, type Pedido, type Vendedor } from '../lib/types'

type CampoData = 'pagamento' | 'pedido' | 'envio'

const LABEL_CAMPO: Record<CampoData, string> = {
  pagamento: 'Data do pagamento',
  pedido: 'Data de registro',
  envio: 'Data do envio',
}

const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const dataRef = (p: Pedido, campo: CampoData) => {
  if (campo === 'pedido') return (p.data_pedido || p.created_at || '').slice(0, 10)
  if (campo === 'envio') return p.data_envio || (p.data_pedido || p.created_at || '').slice(0, 10)
  return p.data_pagamento || (p.data_pedido || p.created_at || '').slice(0, 10)
}

const formatarDataISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const somarDiasISO = (iso: string, dias: number) => {
  const base = parseData(iso) ?? new Date()
  base.setDate(base.getDate() + dias)
  return formatarDataISO(base)
}

/**
 * Resumo de vendas e comissões do período (tela Relatório).
 * Otimizado para visualização direta no celular e no computador, sem precisar baixar PDF.
 */
export default function RelatorioResumo({ embutido = false }: { embutido?: boolean } = {}) {
  const { db, nomeVendedor, avisar } = useStore()
  // regras de comissão: valor do metro (a partir da vigência) + tabela antiga no histórico
  const regras = useMemo(() => regrasDaConfig(db.configuracoes), [db.configuracoes])
  const [campo, setCampo] = useState<CampoData>('pedido')
  const [inicio, setInicio] = useState(hojeISO)
  const [fim, setFim] = useState(hojeISO)
  const [vendedorId, setVendedorId] = useState('todos')
  const [excluidos, setExcluidos] = useState<string[]>([])
  const [buscaPedido, setBuscaPedido] = useState('')
  const [limiteLista, setLimiteLista] = useState(500)
  const [mostrarDatasPersonalizadas, setMostrarDatasPersonalizadas] = useState(false)

  /**
   * Filas que entram na conta: SÓ as concluídas (as que já saíram da máquina).
   */
  const base = useMemo(() => filasDaComissao(db.pedidos), [db.pedidos])

  const primeiraDataHistorico = useMemo(() => {
    let menor = '2026-01-01'
    for (const p of base) {
      const d = dataRef(p, campo)
      if (d && d < menor) menor = d
    }
    return menor
  }, [base, campo])

  const atalhos = useMemo(() => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()
    const ontemISO = somarDiasISO(hojeISO(), -1)
    return [
      { id: 'hoje', label: 'Hoje', de: hojeISO(), ate: hojeISO() },
      { id: 'ontem', label: 'Ontem', de: ontemISO, ate: ontemISO },
      { id: '7dias', label: 'Últimos 7 dias', de: somarDiasISO(hojeISO(), -6), ate: hojeISO() },
      {
        id: 'semana',
        label: 'Esta semana',
        de: somarDiasISO(hojeISO(), -((hoje.getDay() + 6) % 7)),
        ate: hojeISO(),
      },
      {
        id: 'mes',
        label: 'Este mês',
        de: `${ano}-${String(mes + 1).padStart(2, '0')}-01`,
        ate: hojeISO(),
      },
      {
        id: 'mes-passado',
        label: 'Mês passado',
        de: formatarDataISO(new Date(ano, mes - 1, 1)),
        ate: formatarDataISO(new Date(ano, mes, 0)),
      },
      { id: '30dias', label: 'Últimos 30 dias', de: somarDiasISO(hojeISO(), -29), ate: hojeISO() },
      { id: 'tudo', label: 'Todo o período', de: primeiraDataHistorico, ate: hojeISO() },
    ]
  }, [primeiraDataHistorico])

  /** Meses que possuem pedidos concluídos para seleção em 1 toque no celular */
  const mesesDisponiveis = useMemo(() => {
    const contagemPorMes = new Map<string, number>()
    contagemPorMes.set(hojeISO().slice(0, 7), 0)
    for (const p of base) {
      const d = dataRef(p, campo)
      if (/^\d{4}-\d{2}/.test(d)) {
        const ym = d.slice(0, 7)
        contagemPorMes.set(ym, (contagemPorMes.get(ym) ?? 0) + 1)
      }
    }
    return [...contagemPorMes.keys()]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 12)
      .map((anoMes) => {
        const [a, m] = anoMes.split('-').map(Number)
        const de = `${anoMes}-01`
        const ultimoDia = formatarDataISO(new Date(a, m, 0))
        const qtd = contagemPorMes.get(anoMes) ?? 0
        return {
          id: anoMes,
          label: `${NOMES_MESES[(m || 1) - 1]}/${String(a).slice(-2)}`,
          qtd,
          de,
          ate: ultimoDia,
        }
      })
  }, [base, campo])

  /** Todos os pedidos concluídos do mês/período escolhido (antes do filtro de funcionária) */
  const pedidosDoPeriodo = useMemo(() => {
    return base.filter((p) => {
      const d = dataRef(p, campo)
      if (!d) return false
      return d >= inicio && d <= fim
    })
  }, [base, campo, fim, inicio])

  /**
   * Lista no relatório apenas as funcionárias que trabalharam no mês/período selecionado
   * (evitando mostrar ex-funcionárias que já saíram da empresa).
   */
  const vendedoresNoPeriodo = useMemo(() => {
    const doPeriodo = vendedoresDoPeriodo(db.vendedores, pedidosDoPeriodo)
    if (doPeriodo.length > 0) return doPeriodo
    return vendedoresAtivosAtual(db.vendedores, db.pedidos)
  }, [db.pedidos, db.vendedores, pedidosDoPeriodo])

  const temSemVendedorNoPeriodo = useMemo(
    () => pedidosDoPeriodo.some((p) => !p.vendedor_id),
    [pedidosDoPeriodo],
  )

  const vendedorIdAtivo = useMemo(() => {
    if (vendedorId === 'todos') return 'todos'
    if (vendedorId === 'sem-vendedor') return temSemVendedorNoPeriodo ? 'sem-vendedor' : 'todos'
    return vendedoresNoPeriodo.some((v) => v.id === vendedorId) ? vendedorId : 'todos'
  }, [temSemVendedorNoPeriodo, vendedorId, vendedoresNoPeriodo])

  const filtrados = useMemo(() => {
    return pedidosDoPeriodo
      .filter((p) => {
        if (vendedorIdAtivo === 'sem-vendedor') return !p.vendedor_id
        if (vendedorIdAtivo !== 'todos') return p.vendedor_id === vendedorIdAtivo
        return true
      })
      .sort((a, b) => dataRef(b, campo).localeCompare(dataRef(a, campo)) || b.numero - a.numero)
  }, [campo, pedidosDoPeriodo, vendedorIdAtivo])

  const visiveis = useMemo(() => filtrados.filter((p) => !excluidos.includes(p.id)), [excluidos, filtrados])

  const visiveisBusca = useMemo(() => {
    const termo = buscaPedido.trim().toLocaleLowerCase('pt-BR')
    if (!termo) return visiveis
    return visiveis.filter((p) =>
      [p.cliente_nome, `#${p.numero}`, String(p.numero), p.descricao, nomeVendedor(p.vendedor_id)]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(termo),
    )
  }, [buscaPedido, nomeVendedor, visiveis])

  const visiveisTela = useMemo(() => visiveisBusca.slice(0, limiteLista), [limiteLista, visiveisBusca])

  const resumoVendedores = useMemo(() => {
    return comissaoPorVendedor(visiveis, regras)
      .map((linha) => ({
        ...linha,
        vendedor: db.vendedores.find((v) => v.id === linha.chave) as Vendedor | undefined,
        comissao: linha.resultado.total,
        percentualMedio: linha.resultado.percentualMedio,
      }))
      .sort((a, b) => b.faturamento - a.faturamento)
  }, [db.vendedores, regras, visiveis])

  const resultado = useMemo(() => calcularComissao(visiveis, regras), [regras, visiveis])

  const totais = useMemo(
    () => ({
      pedidos: visiveis.length,
      metragem: visiveis.reduce((s, p) => s + Number(p.metragem || 0), 0),
      faturamento: resultado.base,
      comissao: resultado.total,
    }),
    [resultado, visiveis],
  )

  const exportarCSV = () => {
    const linhas: (string | number)[][] = [
      [
        'Tipo DTF',
        'Cliente',
        'Vendedor',
        'Metragem',
        'Valor',
        'Comissão',
        'Data',
        '% comissão',
        'Nº',
        'Descrição',
        'Forma de pagamento',
        'Pago',
        'Entregue',
      ],
      ...visiveis.map((p) => [
        rotuloTipoDtf(p.tipo_dtf),
        p.cliente_nome,
        nomeVendedor(p.vendedor_id),
        numeroBR(p.metragem),
        numeroBR(p.valor),
        numeroBR(comissaoDoPedido(p, regras)),
        dataBR(p.data_pedido || p.created_at),
        percentualBR(regraDoPedido(p, regras).percentual),
        p.numero,
        p.descricao,
        p.forma_pagamento,
        'Sim',
        p.entregue ? 'Sim' : 'Não',
      ]),
    ]
    baixarCSV(`relatorio-altoprints-${inicio}-a-${fim}`, linhas)
    avisar('CSV gerado! O arquivo abre no Excel com os acentos corretos.')
  }

  const ehDiaUnico = inicio === fim
  const periodoTexto = ehDiaUnico ? dataBR(inicio) : `${dataBR(inicio)} — ${dataBR(fim)}`

  const valorSelectEpocaRelatorio = useMemo(() => {
    const atalhoAtivo = atalhos.find((a) => a.de === inicio && a.ate === fim)
    if (atalhoAtivo) return `atalho:${atalhoAtivo.id}`
    const mesAtivo = mesesDisponiveis.find(
      (m) => m.de === inicio && (m.ate === fim || (m.id === hojeISO().slice(0, 7) && fim === hojeISO())),
    )
    if (mesAtivo) return `mes:${mesAtivo.id}`
    return 'personalizado'
  }, [atalhos, fim, inicio, mesesDisponiveis])

  const selecionarEpocaRelatorio = (valor: string) => {
    if (valor === 'personalizado') {
      setMostrarDatasPersonalizadas(true)
      return
    }
    if (valor.startsWith('atalho:')) {
      const id = valor.slice(7)
      const a = atalhos.find((item) => item.id === id)
      if (a) {
        setInicio(a.de)
        setFim(a.ate)
        setLimiteLista(500)
      }
      return
    }
    if (valor.startsWith('mes:')) {
      const id = valor.slice(4)
      const m = mesesDisponiveis.find((item) => item.id === id)
      if (m) {
        setInicio(m.de)
        setFim(m.ate > hojeISO() ? hojeISO() : m.ate)
        setLimiteLista(500)
      }
    }
  }

  return (
    <>
      {/* ------------------------------ tela ------------------------------ */}
      <div className="print:hidden">
        {embutido ? (
          <BarraAcoes>
            <Botao tamanho="sm" variante="secundario" icone={Printer} onClick={() => imprimirDocumento()}>
              Imprimir / PDF
            </Botao>
            <Botao tamanho="sm" variante="secundario" icone={FileSpreadsheet} onClick={exportarCSV}>
              Exportar CSV
            </Botao>
          </BarraAcoes>
        ) : (
          <TituloPagina
            icone={BarChart3}
            titulo="Relatório de vendas"
            subtitulo="Veja comissões, vendas e filas concluídas direto na tela do celular ou computador."
            acoes={
              <>
                <Botao tamanho="sm" variante="secundario" icone={Printer} onClick={() => imprimirDocumento()}>
                  Imprimir / PDF
                </Botao>
                <Botao tamanho="sm" variante="secundario" icone={FileSpreadsheet} onClick={exportarCSV}>
                  Exportar CSV
                </Botao>
              </>
            }
          />
        )}

        {/* Filtro discreto e limpo (começa sempre no Diário / Hoje) */}
        <div className="mb-3 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 sm:text-sm dark:text-slate-300">
              <CalendarClock className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <span>{LABEL_CAMPO[campo]}:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{periodoTexto}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {atalhos
                .filter((a) => ['hoje', 'ontem', 'mes', 'tudo'].includes(a.id))
                .map((a) => {
                  const ativo = inicio === a.de && fim === a.ate
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setInicio(a.de)
                        setFim(a.ate)
                        setLimiteLista(500)
                      }}
                      className={cn(
                        'rounded-xl border px-2.5 py-1.5 text-xs font-extrabold transition active:scale-95',
                        ativo
                          ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                      )}
                    >
                      {a.id === 'hoje' ? 'Hoje (Diário)' : a.label}
                    </button>
                  )
                })}

              <Selecao
                aria-label="Filtrar época do relatório"
                value={valorSelectEpocaRelatorio}
                onChange={(e) => selecionarEpocaRelatorio(e.target.value)}
                className="min-h-[38px] w-auto min-w-[155px] py-1.5 text-xs font-extrabold sm:text-xs"
              >
                <optgroup label="Períodos rápidos">
                  {atalhos.map((a) => (
                    <option key={a.id} value={`atalho:${a.id}`}>
                      {a.id === 'hoje' ? 'Hoje (Diário)' : a.label}
                    </option>
                  ))}
                  <option value="personalizado">Escolher datas...</option>
                </optgroup>
                {mesesDisponiveis.length > 0 ? (
                  <optgroup label="Meses disponíveis">
                    {mesesDisponiveis.map((m) => (
                      <option key={m.id} value={`mes:${m.id}`}>
                        Mês de {m.label} ({m.qtd} filas)
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </Selecao>

              <Selecao
                aria-label="Filtrar funcionária do período"
                value={vendedorIdAtivo}
                onChange={(e) => setVendedorId(e.target.value)}
                className="min-h-[38px] w-auto min-w-[145px] py-1.5 text-xs font-extrabold sm:text-xs"
              >
                <option value="todos">Todas funcionárias ({vendedoresNoPeriodo.length})</option>
                {vendedoresNoPeriodo.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome} ({pedidosDoPeriodo.filter((p) => p.vendedor_id === v.id).length})
                  </option>
                ))}
                {temSemVendedorNoPeriodo ? <option value="sem-vendedor">Sem funcionário</option> : null}
              </Selecao>

              <button
                type="button"
                onClick={() => setMostrarDatasPersonalizadas((v) => !v)}
                className={cn(
                  'rounded-xl border px-2.5 py-1.5 text-xs font-bold transition',
                  mostrarDatasPersonalizadas
                    ? 'border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-200'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                {mostrarDatasPersonalizadas ? 'Ocultar datas' : 'Datas'}
              </button>
            </div>
          </div>

          {mostrarDatasPersonalizadas ? (
            <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3 lg:grid-cols-4 dark:border-slate-800">
              <Campo label="Dia único" className="col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Dia anterior"
                    onClick={() => {
                      const d = somarDiasISO(inicio, -1)
                      setInicio(d)
                      setFim(d)
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <Entrada
                    type="date"
                    value={ehDiaUnico ? inicio : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setInicio(e.target.value)
                        setFim(e.target.value)
                        setLimiteLista(500)
                      }
                    }}
                  />
                  <button
                    type="button"
                    title="Próximo dia"
                    onClick={() => {
                      const d = somarDiasISO(fim, 1)
                      setInicio(d)
                      setFim(d)
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </Campo>

              <Campo label="Início (De)">
                <Entrada
                  type="date"
                  value={inicio}
                  onChange={(e) => {
                    setInicio(e.target.value)
                    setLimiteLista(500)
                  }}
                />
              </Campo>
              <Campo label="Fim (Até)">
                <Entrada
                  type="date"
                  value={fim}
                  onChange={(e) => {
                    setFim(e.target.value)
                    setLimiteLista(500)
                  }}
                />
              </Campo>
              <Campo label="Filtrar por">
                <Selecao value={campo} onChange={(e) => setCampo(e.target.value as CampoData)}>
                  <option value="pagamento">Data do pagamento</option>
                  <option value="pedido">Data do pedido</option>
                  <option value="envio">Data do envio</option>
                </Selecao>
              </Campo>
            </div>
          ) : null}
        </div>

        {/* Resumo principal em destaque logo no topo e com cartões maiores */}
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CartaoResumo
            titulo="Filas concluídas"
            valor={totais.pedidos}
            icone={Receipt}
            gradiente="from-pink-500 to-purple-600"
          />
          <CartaoResumo
            titulo="Metragem total"
            valor={`${numeroBR(totais.metragem)} m`}
            icone={Ruler}
            gradiente="from-sky-500 to-blue-600"
          />
          <CartaoResumo
            titulo="Faturamento"
            valor={moeda(totais.faturamento)}
            icone={FileSpreadsheet}
            gradiente="from-emerald-500 to-green-600"
          />
          <CartaoResumo
            titulo="Comissão"
            valor={moeda(totais.comissao)}
            icone={Percent}
            gradiente="from-amber-500 to-orange-600"
            sub={`média de ${numeroBR(totais.faturamento ? (totais.comissao / totais.faturamento) * 100 : 0, 2)}% no período`}
          />
        </div>

        {/* resumo por vendedor */}
        <Cartao className="mb-3" hover={false}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Resumo por vendedor</h2>
            <div className="flex items-center gap-2">
              {vendedorIdAtivo !== 'todos' ? (
                <Botao tamanho="sm" variante="secundario" onClick={() => setVendedorId('todos')}>
                  Mostrar todos
                </Botao>
              ) : null}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {resumoVendedores.length} vendedor(es)
              </span>
            </div>
          </div>

          {/* Visão mobile em cartões maiores (sem precisar rolar tabela nem baixar PDF) */}
          <div className="space-y-3 md:hidden">
            {resumoVendedores.map((linha) => {
              const chaveFiltro = linha.chave === '__sem_vendedor__' ? 'sem-vendedor' : linha.chave
              const selecionado = vendedorIdAtivo === chaveFiltro
              return (
                <div
                  key={linha.chave}
                  className={cn(
                    'rounded-2xl border p-3.5 transition',
                    selecionado
                      ? 'border-purple-300 bg-purple-50/40 dark:border-purple-700 dark:bg-purple-950/30'
                      : 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-extrabold text-slate-800 dark:text-slate-100">
                        {linha.vendedor?.nome ?? 'Sem vendedor'}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {linha.pedidos} pedido(s) • {numeroBR(linha.metragem)} m • ticket{' '}
                        {moeda(linha.faturamento / (linha.pedidos || 1))}
                      </p>
                    </div>
                    <Botao
                      tamanho="sm"
                      variante="secundario"
                      icone={Eye}
                      onClick={() => setVendedorId(selecionado ? 'todos' : chaveFiltro)}
                    >
                      {selecionado ? 'Todos' : 'Filtrar'}
                    </Botao>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5 rounded-xl bg-white p-3 dark:bg-slate-900">
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Faturamento
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {moeda(linha.faturamento)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Comissão ({numeroBR(linha.percentualMedio, 2)}%)
                      </span>
                      <span className="text-base font-black text-amber-600 dark:text-amber-400">
                        {moeda(linha.comissao)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            {resumoVendedores.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-3.5 text-sm font-extrabold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Total das colunas (equipe)
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Pedidos</span>
                    <span className="text-base font-black text-slate-800 dark:text-slate-100">{totais.pedidos}</span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Metragem</span>
                    <span className="text-base font-black text-slate-800 dark:text-slate-100">{numeroBR(totais.metragem)} m</span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Faturamento</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400">{moeda(totais.faturamento)}</span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Comissão</span>
                    <span className="text-base font-black text-amber-700 dark:text-amber-400">{moeda(totais.comissao)}</span>
                  </div>
                </div>
              </div>
            ) : null}
            {resumoVendedores.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                Nenhuma fila concluída no período selecionado.
              </p>
            ) : null}
          </div>

          <div className="tabela-scroll hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Vendedor</th>
                  <th className="px-3 py-2.5 text-right">Pedidos</th>
                  <th className="px-3 py-2.5 text-right">Metragem</th>
                  <th className="px-3 py-2.5 text-right">Faturamento</th>
                  <th className="px-3 py-2.5 text-right">Comissão</th>
                  <th className="px-3 py-2.5 text-right">Ticket médio</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumoVendedores.map((linha) => (
                  <tr key={linha.chave} className="text-slate-600 hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-bold text-slate-800">{linha.vendedor?.nome ?? 'Sem vendedor'}</td>
                    <td className="px-3 py-2.5 text-right">{linha.pedidos}</td>
                    <td className="px-3 py-2.5 text-right">{numeroBR(linha.metragem)} m</td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{moeda(linha.faturamento)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600">
                      {moeda(linha.comissao)}
                      <span className="block text-[11px] font-normal text-slate-400">
                        {numeroBR(linha.percentualMedio, 2)}% médio
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">{moeda(linha.faturamento / (linha.pedidos || 1))}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Botao
                        tamanho="sm"
                        variante="secundario"
                        icone={Eye}
                        onClick={() =>
                          setVendedorId(linha.chave === '__sem_vendedor__' ? 'sem-vendedor' : linha.chave)
                        }
                      >
                        Ver só este
                      </Botao>
                    </td>
                  </tr>
                ))}
                {resumoVendedores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">
                      Nenhuma fila concluída no período selecionado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
              {resumoVendedores.length ? (
                <tfoot>
                  <tr className="bg-slate-50 font-extrabold text-slate-800">
                    <td className="px-3 py-2.5">TOTAL</td>
                    <td className="px-3 py-2.5 text-right">{totais.pedidos}</td>
                    <td className="px-3 py-2.5 text-right">{numeroBR(totais.metragem)} m</td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">{moeda(totais.faturamento)}</td>
                    <td className="px-3 py-2.5 text-right text-amber-700">{moeda(totais.comissao)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {moeda(totais.faturamento / (totais.pedidos || 1))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </Cartao>

        {/* detalhamento */}
        <Cartao hover={false}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Detalhamento das filas concluídas
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{visiveisBusca.length} filas</span>
              {excluidos.length ? (
                <Botao tamanho="sm" variante="secundario" icone={RotateCcw} onClick={() => setExcluidos([])}>
                  Restaurar todos ({excluidos.length})
                </Botao>
              ) : null}
            </div>
          </div>

          {visiveis.length > 5 ? (
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Entrada
                value={buscaPedido}
                onChange={(e) => setBuscaPedido(e.target.value)}
                placeholder="Buscar pedido por cliente, tipo de DTF ou funcionário..."
                className="pl-9"
              />
            </div>
          ) : null}

          {excluidos.length ? (
            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              <Undo2 className="mr-1 inline h-3.5 w-3.5" />
              {excluidos.length} pedido(s) foram tirados apenas desta tela. Nada foi apagado do sistema.
            </p>
          ) : null}

          {visiveisBusca.length === 0 ? (
            <Vazio
              icone={Receipt}
              titulo="Nenhuma fila concluída no período"
              descricao="Só entram no relatório as filas marcadas como concluídas em Pedidos. Ajuste o período ou o filtro de vendedor."
            />
          ) : (
            <>
              {/* Lista mobile em cartões compactos (leitura fácil na tela do celular) */}
              <div className="space-y-2 md:hidden">
                {visiveisTela.map((p) => {
                  const regra = regraDoPedido(p, regras)
                  const pct = regra.percentual
                  const valorComissao = comissaoDoPedido(p, regras)
                  const ehUv = p.tipo_dtf === 'uv'
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'rounded-md px-1.5 py-0.5 text-[11px] font-black text-white',
                                ehUv
                                  ? 'bg-gradient-to-r from-indigo-500 to-blue-600'
                                  : 'bg-gradient-to-r from-pink-500 to-purple-600',
                              )}
                            >
                              {rotuloTipoDtf(p.tipo_dtf)}
                            </span>
                            <span className="break-words text-sm font-extrabold text-slate-800 dark:text-slate-100">
                              {p.cliente_nome}
                            </span>
                          </div>
                          {p.descricao ? (
                            <p className="mt-0.5 break-words text-xs text-slate-500 dark:text-slate-400">
                              {p.descricao}
                            </p>
                          ) : null}
                          {p.observacoes && p.observacoes !== p.descricao ? (
                            <p className="mt-0.5 break-words text-xs font-medium text-amber-700 dark:text-amber-300">
                              Obs.: {p.observacoes}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {nomeVendedor(p.vendedor_id)} • {p.metragem ? `${numeroBR(p.metragem)} m` : 'Sem metragem'} •{' '}
                            {dataBR(p.data_pedido || p.created_at)}
                          </p>
                        </div>
                        <button
                          title="Tirar do relatório (não apaga o pedido)"
                          onClick={() => setExcluidos((e) => [...e, p.id])}
                          className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2 text-xs dark:border-slate-800">
                        <div>
                          <span className="text-slate-400">Valor: </span>
                          <b className="text-sm font-black text-emerald-600 dark:text-emerald-400">{moeda(p.valor)}</b>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">Comissão ({percentualBR(pct)}): </span>
                          <b className="text-sm font-black text-amber-600 dark:text-amber-400">{moeda(valorComissao)}</b>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="tabela-scroll hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="border border-slate-200 px-3 py-2">Tipo DTF</th>
                      <th className="border border-slate-200 px-3 py-2">Cliente</th>
                      <th className="border border-slate-200 px-3 py-2">Vendedor</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">Metragem</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">Valor</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">R$/metro</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">Comissão</th>
                      <th className="border border-slate-200 px-3 py-2">Data</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">% com.</th>
                      <th className="border border-slate-200 px-3 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveisTela.map((p, i) => (
                      <tr key={p.id} className={cn(i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white', 'hover:bg-purple-50/40')}>
                        <td className="border border-slate-200 px-3 py-2 font-bold text-slate-700 whitespace-nowrap">
                          {rotuloTipoDtf(p.tipo_dtf)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          <span className="font-semibold text-slate-700">{p.cliente_nome}</span>
                          {p.descricao ? <span className="block text-xs text-slate-400">{p.descricao}</span> : null}
                          {p.observacoes && p.observacoes !== p.descricao ? (
                            <span className="block text-xs text-amber-700">Obs.: {p.observacoes}</span>
                          ) : null}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">{nomeVendedor(p.vendedor_id)}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                          {p.metragem ? `${numeroBR(p.metragem)} m` : '—'}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-bold tabular-nums text-emerald-600">
                          {moeda(p.valor)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-slate-500">
                          {valorDoMetroPedido(p) === null ? '—' : moeda(valorDoMetroPedido(p))}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-semibold tabular-nums text-amber-600">
                          {moeda(comissaoDoPedido(p, regras))}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 whitespace-nowrap">
                          {dataBR(p.data_pedido || p.created_at)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-slate-500">
                          {percentualBR(regraDoPedido(p, regras).percentual)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-center">
                          <button
                            title="Tirar do relatório (não apaga o pedido)"
                            onClick={() => setExcluidos((e) => [...e, p.id])}
                            className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {visiveisBusca.length > limiteLista ? (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <Botao
                    tamanho="sm"
                    variante="secundario"
                    onClick={() => setLimiteLista((atual) => atual + 150)}
                  >
                    Mostrar mais pedidos ({visiveisBusca.length - limiteLista} restantes)
                  </Botao>
                  <Botao
                    tamanho="sm"
                    variante="ghost"
                    onClick={() => setLimiteLista(visiveisBusca.length)}
                  >
                    Mostrar todos ({visiveisBusca.length})
                  </Botao>
                </div>
              ) : null}
            </>
          )}
        </Cartao>
      </div>

      {/* --------------------- versão impressa (A4) ---------------------- */}
      <div className="print-area">
        <div className="mb-4 flex items-center gap-3 border-b-2 border-black pb-3">
          <LogoImpressao />
          <div className="ml-auto text-right text-[13px] leading-tight">
            <p className="text-lg font-black uppercase">{db.configuracoes.empresa_nome || 'Altoprints'}</p>
            <p className="font-bold">Relatório de vendas pagas e comissões da equipe</p>
            <p>
              Período ({LABEL_CAMPO[campo].toLowerCase()}): {periodoTexto}
            </p>
            <p>Emitido em {dataBR(new Date().toISOString())}</p>
          </div>
        </div>

        {/* comissão de cada pessoa da equipe — com totais abaixo de cada coluna */}
        <div className="sem-quebra mb-4">
          <p className="mb-1 font-bold">Comissões da equipe</p>
          <table className="tabela-print">
            <thead>
              <tr>
                <th>Vendedor</th>
                <th className="num">Pedidos</th>
                <th className="num">Metragem</th>
                <th className="num">Faturamento</th>
                <th className="num">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {resumoVendedores.map((l) => (
                <tr key={l.chave}>
                  <td>{l.vendedor?.nome ?? 'Sem vendedor'}</td>
                  <td className="num">{l.pedidos}</td>
                  <td className="num">{numeroBR(l.metragem)} m</td>
                  <td className="num">{moeda(l.faturamento)}</td>
                  <td className="num">{moeda(l.comissao)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL</td>
                <td className="num">{totais.pedidos}</td>
                <td className="num">{numeroBR(totais.metragem)} m</td>
                <td className="num">{moeda(totais.faturamento)}</td>
                <td className="num">{moeda(totais.comissao)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mb-1 font-bold">Detalhamento dos pedidos</p>
        <table className="tabela-print">
          <thead>
            <tr>
              <th>Tipo DTF</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th className="num">Metragem</th>
              <th className="num">Valor</th>
              <th className="num">Comissão</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((p) => (
              <tr key={p.id}>
                <td>{rotuloTipoDtf(p.tipo_dtf)}</td>
                <td>
                  {p.cliente_nome}
                  {p.descricao ? <div style={{ fontSize: '11px' }}>{p.descricao}</div> : null}
                </td>
                <td>{nomeVendedor(p.vendedor_id)}</td>
                <td className="num">{p.metragem ? `${numeroBR(p.metragem)} m` : '—'}</td>
                <td className="num">{moeda(p.valor)}</td>
                <td className="num">{moeda(comissaoDoPedido(p, regras))}</td>
                <td>{dataBR(p.data_pedido || p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px]">
          Documento gerado pelo sistema {db.configuracoes.empresa_nome || 'Altoprints'} em{' '}
          {dataBR(new Date().toISOString())}.
        </p>
      </div>
    </>
  )
}
