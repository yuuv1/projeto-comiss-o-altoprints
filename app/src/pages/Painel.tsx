import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Crown,
  Layers,
  Package,
  PackageCheck,
  Percent,
  Plus,
  Ruler,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Botao, Campo, Cartao, CartaoResumo, Entrada, Selecao, TituloPagina, cn } from '../components/ui'
import { calcularComissao, comissaoPorVendedor, regrasDaConfig } from '../lib/comissao'
import { vendedoresAtivosAtual, vendedoresDoPeriodo } from '../lib/equipe-inicial'
import { dataBR, hojeISO, moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { filasDaComissao, type Pedido } from '../lib/types'

const primeiroDiaDoMes = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const formatarDataISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const dataRegistro = (p: Pedido) => (p.data_pedido || p.created_at || '').slice(0, 10)

type PeriodoPainel = 'hoje' | 'ontem' | '7' | 'mes' | 'mes-passado' | '30' | '90' | 'tudo' | 'personalizado'

/** Painel do proprietário: tudo, de todos */
export default function Painel() {
  const { db, vendedorPorId } = useStore()
  const { usuario } = useAuth()
  const navegar = useNavigate()

  // regras de comissão (valor do metro a partir da vigência; metragem no histórico)
  const regras = useMemo(() => regrasDaConfig(db.configuracoes), [db.configuracoes])

  const [periodo, setPeriodo] = useState<PeriodoPainel>('hoje')
  const [inicioPersonalizado, setInicioPersonalizado] = useState(primeiroDiaDoMes)
  const [fimPersonalizado, setFimPersonalizado] = useState(hojeISO)

  const [inicio, fim] = useMemo(() => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()
    if (periodo === 'hoje') return [hojeISO(), hojeISO()]
    if (periodo === 'ontem') {
      const ontem = new Date(hoje.getTime() - 86400000).toISOString().slice(0, 10)
      return [ontem, ontem]
    }
    if (periodo === '7')
      return [new Date(hoje.getTime() - 7 * 86400000).toISOString().slice(0, 10), hojeISO()]
    if (periodo === 'mes') return [primeiroDiaDoMes(), hojeISO()]
    if (periodo === 'mes-passado')
      return [
        new Date(ano, mes - 1, 1).toISOString().slice(0, 10),
        new Date(ano, mes, 0).toISOString().slice(0, 10),
      ]
    if (periodo === '30')
      return [new Date(hoje.getTime() - 30 * 86400000).toISOString().slice(0, 10), hojeISO()]
    if (periodo === '90')
      return [new Date(hoje.getTime() - 90 * 86400000).toISOString().slice(0, 10), hojeISO()]
    if (periodo === 'personalizado')
      return [inicioPersonalizado || '1900-01-01', fimPersonalizado || '2999-12-31']
    return ['1900-01-01', '2999-12-31']
  }, [fimPersonalizado, inicioPersonalizado, periodo])

  const pedidosPeriodo = useMemo(
    () => db.pedidos.filter((p) => dataRegistro(p) >= inicio && dataRegistro(p) <= fim),
    [db.pedidos, fim, inicio],
  )

  const pagos = filasDaComissao(pedidosPeriodo)
  const faturamento = pagos.reduce((s, p) => s + Number(p.valor || 0), 0)
  const metragemPeriodo = pagos.reduce((s, p) => s + Number(p.metragem || 0), 0)
  const comissao = calcularComissao(pagos, regras)

  const filasTextilPeriodo = pagos.filter((p) => (p.tipo_dtf || 'textil') === 'textil')

  const todasTextil = db.pedidos.filter((p) => (p.tipo_dtf || 'textil') === 'textil')
  const concluidas = db.pedidos.filter((p) => p.estagio === 'concluido')
  const entregues = db.pedidos.filter((p) => p.entregue)

  const hoje = hojeISO()

  const mesesDisponiveis = useMemo(() => {
    const conjunto = new Set<string>()
    conjunto.add(hoje.slice(0, 7))
    for (const p of db.pedidos) {
      const d = dataRegistro(p)
      if (/^\d{4}-\d{2}/.test(d)) conjunto.add(d.slice(0, 7))
    }
    return [...conjunto]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 12)
      .map((anoMes) => {
        const [a, m] = anoMes.split('-').map(Number)
        const de = `${anoMes}-01`
        const ultimoDia = formatarDataISO(new Date(a, m, 0))
        return {
          id: anoMes,
          label: `${NOMES_MESES[(m || 1) - 1]}/${String(a).slice(-2)}`,
          de,
          ate: ultimoDia > hoje ? hoje : ultimoDia,
        }
      })
  }, [db.pedidos, hoje])

  const mesAtual = hoje.slice(0, 7)
  const equipe = useMemo(() => {
    const pedidosMesAtual = db.pedidos.filter((p) => dataRegistro(p).startsWith(mesAtual))
    const basePeriodo = pedidosPeriodo.length > 0 ? pedidosPeriodo : pedidosMesAtual
    const vendedoresVisiveis =
      basePeriodo.length > 0
        ? vendedoresDoPeriodo(db.vendedores, basePeriodo)
        : vendedoresAtivosAtual(db.vendedores, db.pedidos, hoje)

    const listaBase = vendedoresVisiveis.length > 0 ? vendedoresVisiveis : vendedoresAtivosAtual(db.vendedores, db.pedidos, hoje)

    return listaBase
      .map((conta) => {
        const meus = db.pedidos.filter((p) => p.vendedor_id === conta.id)
        const noPeriodo = pedidosPeriodo.filter((p) => p.vendedor_id === conta.id)
        const concluidos = filasDaComissao(noPeriodo)
        const ultima = (noPeriodo.length > 0 ? noPeriodo : meus)
          .map((p) => p.data_pedido)
          .filter(Boolean)
          .sort()
          .pop()
        return {
          conta,
          pedidos: noPeriodo.length,
          faturamento: concluidos.reduce((s, p) => s + Number(p.valor || 0), 0),
          comissao: calcularComissao(concluidos, regras).total,
          ultima: ultima ?? null,
        }
      })
      .sort((a, b) => b.faturamento - a.faturamento || a.conta.nome.localeCompare(b.conta.nome))
  }, [db.pedidos, db.vendedores, hoje, mesAtual, pedidosPeriodo, regras])

  const ranking = useMemo(
    () =>
      comissaoPorVendedor(pagos, regras)
        .map((l) => ({
          ...l,
          vendedor: vendedorPorId(l.chave),
        }))
        .sort((a, b) => b.faturamento - a.faturamento),
    [pagos, regras, vendedorPorId],
  )

  const maiorFaturamento = Math.max(1, ...ranking.map((r) => r.faturamento))

  /** os atalhos caem direto na fila certa dentro de Pedidos */
  const atalhos = [
    { label: 'Concluídas', valor: concluidas.length, icone: CheckCircle2, to: '/pedidos', cor: 'from-emerald-500 to-green-600' },
    { label: 'DTF Têxtil', valor: todasTextil.length, icone: Layers, to: '/pedidos?filtro=textil', cor: 'from-pink-500 to-purple-600' },
    { label: 'Entregues', valor: entregues.length, icone: PackageCheck, to: '/pedidos?filtro=entregue', cor: 'from-violet-500 to-indigo-600' },
  ]

  /** botões grandes: o que o chefe faz todos os dias, em um toque */
  const acoesGrandes = [
    { label: 'Novo pedido', sub: 'registrar uma fila', icone: Plus, cor: 'from-pink-500 to-purple-600', to: '/pedido/novo' },
    { label: 'DTF Têxtil', sub: `${todasTextil.length} fila(s)`, icone: Layers, cor: 'from-violet-500 to-indigo-600', to: '/pedidos?filtro=textil' },
    { label: 'Equipe', sub: `${equipe.length} funcionário(s)`, icone: Users, cor: 'from-amber-500 to-orange-600', to: '/configuracoes?aba=equipe' },
    { label: 'Relatório', sub: 'ver ou baixar PDF / CSV', icone: BarChart3, cor: 'from-emerald-500 to-green-600', to: '/relatorio' },
  ]

  const valorSelectEpoca = useMemo(() => {
    if (periodo === 'personalizado') {
      const mesMatch = mesesDisponiveis.find((m) => m.de === inicioPersonalizado && m.ate === fimPersonalizado)
      if (mesMatch) return `mes:${mesMatch.id}`
    }
    return periodo
  }, [fimPersonalizado, inicioPersonalizado, mesesDisponiveis, periodo])

  const selecionarEpoca = (valor: string) => {
    if (valor.startsWith('mes:')) {
      const idMes = valor.slice(4)
      const m = mesesDisponiveis.find((item) => item.id === idMes)
      if (!m) return
      if (m.id === mesAtual) {
        setPeriodo('mes')
      } else {
        setInicioPersonalizado(m.de)
        setFimPersonalizado(m.ate)
        setPeriodo('personalizado')
      }
      return
    }
    setPeriodo(valor as PeriodoPainel)
  }

  const textoPeriodoAtivo = inicio === fim ? dataBR(inicio) : `${dataBR(inicio)} — ${dataBR(fim)}`

  return (
    <>
      <TituloPagina
        icone={Crown}
        titulo={`Painel do proprietário`}
        subtitulo={`Visão geral de tudo — ${usuario?.nome ?? ''} • hoje é ${dataBR(hoje)}`}
        acoes={
          <>
            <Botao variante="secundario" icone={BarChart3} onClick={() => navegar('/relatorio')}>
              Relatório
            </Botao>
            <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
              Novo pedido
            </Botao>
          </>
        }
      />

      {/* Filtro de época discreto e limpo (começa sempre no Diário / Hoje) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 sm:text-sm dark:text-slate-300">
          <CalendarClock className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
          <span>Resumo por filtro:</span>
          <span className="font-extrabold text-slate-900 dark:text-white">{textoPeriodoAtivo}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { id: 'hoje', label: 'Hoje (Diário)' },
            { id: 'ontem', label: 'Ontem' },
            { id: 'mes', label: 'Este mês' },
          ] as const).map((op) => {
            const ativo = periodo === op.id
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => setPeriodo(op.id)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-xs font-extrabold transition active:scale-95',
                  ativo
                    ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                )}
              >
                {op.label}
              </button>
            )
          })}

          <Selecao
            aria-label="Filtrar época"
            value={valorSelectEpoca}
            onChange={(e) => selecionarEpoca(e.target.value)}
            className="min-h-[38px] w-auto min-w-[155px] py-1.5 text-xs font-extrabold sm:text-xs"
          >
            <optgroup label="Períodos rápidos">
              <option value="hoje">Hoje (Diário)</option>
              <option value="ontem">Ontem</option>
              <option value="7">Últimos 7 dias</option>
              <option value="mes">Este mês</option>
              <option value="mes-passado">Mês passado</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="tudo">Todo o período</option>
              <option value="personalizado">Escolher datas...</option>
            </optgroup>
            {mesesDisponiveis.length > 0 ? (
              <optgroup label="Meses">
                {mesesDisponiveis.map((m) => (
                  <option key={m.id} value={`mes:${m.id}`}>
                    Mês de {m.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Selecao>
        </div>
      </div>

      {periodo === 'personalizado' ? (
        <Cartao hover={false} className="mb-3">
          <div className="grid grid-cols-2 gap-2.5 sm:max-w-md">
            <Campo label="De">
              <Entrada
                type="date"
                value={inicioPersonalizado}
                onChange={(e) => setInicioPersonalizado(e.target.value)}
              />
            </Campo>
            <Campo label="Até">
              <Entrada
                type="date"
                value={fimPersonalizado}
                onChange={(e) => setFimPersonalizado(e.target.value)}
              />
            </Campo>
          </div>
        </Cartao>
      ) : null}

      {/* Resumo principal em destaque logo no topo e com cartões maiores */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoResumo
          titulo="Pedidos pagos"
          valor={pagos.length}
          icone={Package}
          gradiente="from-pink-500 to-purple-600"
          sub={`${filasTextilPeriodo.length} DTF Têxtil`}
        />
        <CartaoResumo
          titulo="Metragem total"
          valor={`${numeroBR(metragemPeriodo)} m`}
          icone={Ruler}
          gradiente="from-sky-500 to-blue-600"
          sub="metros impressos no período"
        />
        <CartaoResumo
          titulo="Faturamento"
          valor={moeda(faturamento)}
          icone={TrendingUp}
          gradiente="from-emerald-500 to-green-600"
          sub={`ticket médio ${moeda(faturamento / (pagos.length || 1))}`}
        />
        <CartaoResumo
          titulo="Comissões"
          valor={moeda(comissao.total)}
          icone={Percent}
          gradiente="from-amber-500 to-orange-600"
          sub={`${numeroBR(comissao.percentualMedio, 2)}% médio no período`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao className="lg:col-span-2" hover={false}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Desempenho por vendedor
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {dataBR(inicio)} — {dataBR(fim)}
            </span>
          </div>

          {ranking.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
              Nenhum pedido pago no período selecionado.
            </p>
          ) : (
            <div className="space-y-3">
              {ranking.map((linha, i) => (
                <div key={linha.chave} className="rounded-2xl border border-slate-100 p-3.5 sm:p-4 dark:border-slate-800">
                  <div className="mb-2 flex flex-wrap items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black text-white',
                        i === 0
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                          : 'bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="text-base font-extrabold text-slate-800 sm:text-lg dark:text-slate-100">
                      {linha.vendedor?.nome ?? 'Sem vendedor'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 sm:text-sm dark:text-slate-400">
                      {linha.pedidos} pedido(s) • {numeroBR(linha.metragem)} m
                    </span>
                    <span className="ml-auto text-right">
                      <span className="block text-base font-black text-emerald-600 sm:text-lg dark:text-emerald-400">
                        {moeda(linha.faturamento)}
                      </span>
                      <span className="block text-xs font-bold text-amber-600 sm:text-sm dark:text-amber-400">
                        comissão {moeda(linha.resultado.total)} ({numeroBR(linha.resultado.percentualMedio, 2)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600"
                      style={{ width: `${Math.max(4, (linha.faturamento / maiorFaturamento) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Botao
                      tamanho="sm"
                      variante="secundario"
                      onClick={() => navegar(`/pedidos?vendedor=${linha.chave}`)}
                    >
                      Ver pedidos dele
                    </Botao>
                    <Botao tamanho="sm" variante="ghost" onClick={() => navegar('/relatorio')}>
                      Ver no relatório
                    </Botao>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Cartao>

        <div className="space-y-4">
          <Cartao hover={false}>
            <h2 className="mb-3 text-base font-extrabold text-slate-800 dark:text-slate-100">Catálogo de filas</h2>
            <div className="grid gap-2">
              {atalhos.map(({ label, valor, icone: Icone, to, cor }) => (
                <button
                  key={label}
                  onClick={() => navegar(to)}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800"
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white',
                      cor,
                    )}
                  >
                    <Icone className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100">{valor}</span>
                </button>
              ))}
            </div>
            <Botao
              variante="secundario"
              icone={Settings}
              className="mt-3 w-full"
              onClick={() => navegar('/configuracoes?aba=comissoes')}
            >
              Ajustar regras de comissão
            </Botao>
          </Cartao>
        </div>
      </div>

      {/* --------------------------- atalhos grandes do dia --------------------------- */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {acoesGrandes.map(({ label, sub, icone: Icone, cor, to }) => (
          <button
            key={label}
            onClick={() => navegar(to)}
            className="group flex min-h-[64px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-soft transition active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-hover dark:border-slate-800 dark:bg-slate-900 dark:shadow-dark-soft"
          >
            <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm sm:h-10 sm:w-10', cor)}>
              <Icone className="h-6 w-6 sm:h-5 sm:w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-extrabold text-slate-800 sm:text-sm dark:text-slate-100">{label}</span>
              <span className="block truncate text-xs font-semibold text-slate-500 sm:text-[11px] dark:text-slate-400">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* --------------------------- equipe em formato de tabela --------------------------- */}
      <Cartao hover={false} className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Funcionários · mês atual</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {equipe.length} funcionário(s) no período • {db.clientes.length} cliente(s) •{' '}
              {db.usuarios.length} login(s) de proprietário
            </p>
          </div>
          <Botao tamanho="sm" variante="secundario" icone={Users} onClick={() => navegar('/configuracoes?aba=equipe')}>
            Funcionários e acessos
          </Botao>
        </div>

        {/* Cartões mobile grandes para funcionários do respectivo mês */}
        <div className="grid gap-2.5 md:hidden">
          {equipe.map(({ conta, pedidos, faturamento, comissao, ultima }) => (
            <button
              key={conta.id}
              type="button"
              onClick={() => navegar(`/pedidos?vendedor=${conta.id}`)}
              className="flex min-h-[64px] w-full flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-left transition active:scale-[0.98] hover:bg-white dark:border-slate-800 dark:bg-slate-800/60"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-sm font-black text-white shadow-sm">
                  {conta.nome.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-slate-800 dark:text-slate-100">{conta.nome}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {pedidos} pedido(s) • última: {ultima ? dataBR(ultima) : 'sem pedidos'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{moeda(faturamento)}</p>
                <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">comissão {moeda(comissao)}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-2 py-1.5">Funcionário</th>
                <th className="px-2 py-1.5">Situação</th>
                <th className="px-2 py-1.5 text-right">Pedidos</th>
                <th className="px-2 py-1.5 text-right">Faturamento</th>
                <th className="px-2 py-1.5 text-right">Comissão</th>
                <th className="px-2 py-1.5">Última venda</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {equipe.map(({ conta, pedidos, faturamento, comissao, ultima }) => (
                <tr
                  key={conta.id}
                  className="border-t border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                >
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-[10px] font-black text-white">
                        {conta.nome.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-bold">{conta.nome}</span>

                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">sem login (equipe)</td>
                  <td className="px-2 py-2 text-right font-semibold">{pedidos}</td>
                  <td className="px-2 py-2 text-right font-semibold">{moeda(faturamento)}</td>
                  <td className="px-2 py-2 text-right font-bold text-amber-600 dark:text-amber-400">
                    {moeda(comissao)}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {ultima ? dataBR(ultima) : 'sem pedidos'}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Botao
                      tamanho="sm"
                      variante="ghost"
                      onClick={() => navegar('/configuracoes?aba=equipe')}
                    >
                      Abrir
                    </Botao>
                  </td>
                </tr>
              ))}
              {equipe.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                    Nenhum funcionário cadastrado ainda — cadastre em Configurações → Funcionários e acessos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  )
}
