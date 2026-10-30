import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Crown,
  Package,
  PackageCheck,
  Percent,
  Plus,
  Printer,
  RotateCcw,
  Settings,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Abas, Botao, Cartao, CartaoResumo, TituloPagina, cn } from '../components/ui'
import { calcularComissao, comissaoPorVendedor } from '../lib/comissao'
import { dataBR, diasEntre, hojeISO, moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import {
  FAIXAS_PADRAO,
  filasDaComissao,
  LABEL_PAPEL,
  pedidoPendenteFinanceiro,
  type Pedido,
} from '../lib/types'

const primeiroDiaDoMes = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const dataPagamento = (p: Pedido) => p.data_pagamento || (p.data_pedido || '').slice(0, 10)

/** chave simples das faixas, só para saber se o dono já mexeu na tabela oficial */
const resumoDasFaixas = (faixas: { de: number; ate: number | null; percentual: number }[]) =>
  JSON.stringify(faixas.map((f) => [f.de, f.ate, f.percentual]))

/** Painel do proprietário: tudo, de todos */
export default function Painel() {
  const { db, nomeVendedor, vendedorPorId, nuvem } = useStore()
  const { usuario } = useAuth()
  const navegar = useNavigate()

  const faixas = db.configuracoes.faixas_comissao?.length ? db.configuracoes.faixas_comissao : FAIXAS_PADRAO
  const semMetragem = db.configuracoes.comissao_sem_metragem ?? 0

  const [periodo, setPeriodo] = useState<'mes' | '30' | '90' | 'tudo'>('mes')

  const [inicio, fim] = useMemo(() => {
    const hoje = new Date()
    if (periodo === 'mes') return [primeiroDiaDoMes(), hojeISO()]
    if (periodo === '30')
      return [new Date(hoje.getTime() - 30 * 86400000).toISOString().slice(0, 10), hojeISO()]
    if (periodo === '90')
      return [new Date(hoje.getTime() - 90 * 86400000).toISOString().slice(0, 10), hojeISO()]
    return ['1900-01-01', '2999-12-31']
  }, [periodo])

  const pedidosPeriodo = useMemo(
    () => db.pedidos.filter((p) => dataPagamento(p) >= inicio && dataPagamento(p) <= fim),
    [db.pedidos, fim, inicio],
  )

  const pagos = pedidosPeriodo.filter((p) => p.pago)
  const faturamento = pagos.reduce((s, p) => s + Number(p.valor || 0), 0)
  const comissao = calcularComissao(pagos, faixas, semMetragem)

  const aReceberTodos = db.pedidos
    .filter(pedidoPendenteFinanceiro)
    .reduce((s, p) => s + Number(p.valor || 0), 0)

  const aPagar = db.pedidos.filter((p) => !p.pago)
  const emAndamento = db.pedidos.filter((p) => p.estagio !== 'concluido')
  const concluidas = db.pedidos.filter((p) => p.estagio === 'concluido')
  const aEntregar = db.pedidos.filter((p) => p.estagio === 'concluido' && !p.entregue)

  /* ------------------------------ resumo de hoje ------------------------------ */

  const hoje = hojeISO()

  const resumoHoje = useMemo(() => {
    const noDia = (valor?: string | null) => (valor || '').slice(0, 10) === hoje
    const naFila = db.pedidos.filter((p) => p.estagio !== 'concluido')
    const parados = naFila.filter((p) => {
      const quando = new Date(p.data_pedido)
      return !Number.isNaN(quando.getTime()) && diasEntre(new Date(), quando) >= 3
    })
    return {
      criados: db.pedidos.filter((p) => noDia(p.data_pedido)).length,
      pagos: db.pedidos.filter((p) => p.pago && (p.data_pagamento || '') === hoje).length,
      concluidos: db.pedidos.filter((p) => p.estagio === 'concluido' && noDia(p.iniciado_em)).length,
      entregues: db.pedidos.filter(
        (p) => p.entregue && (p.data_entrega === hoje || p.data_retirada === hoje),
      ).length,
      naFila: naFila.length,
      parados: parados.length,
      valorCriado: db.pedidos.filter((p) => noDia(p.data_pedido)).reduce((s, p) => s + Number(p.valor || 0), 0),
    }
  }, [db.pedidos, hoje])

  /* --------------------------- checklist de primeiros passos --------------------------- */

  const passos = useMemo(
    () => [
      {
        id: 'dono',
        titulo: 'Criar o seu acesso de proprietário',
        detalhe: 'é por ele que você entra e vê tudo',
        feito: true,
        to: '/configuracoes?aba=acesso',
      },
      {
        id: 'equipe',
        titulo: 'Cadastrar os funcionários',
        detalhe: 'cada um escolhe o próprio nome ao registrar a fila (sem login)',
        feito: db.vendedores.length > 0,
        to: '/configuracoes?aba=equipe',
      },
      {
        id: 'comissao',
        titulo: 'Conferir a tabela de comissão',
        detalhe: 'as faixas de metragem que definem o que cada um recebe',
        feito: resumoDasFaixas(faixas) !== resumoDasFaixas(FAIXAS_PADRAO),
        to: '/configuracoes?aba=comissoes',
      },
      {
        id: 'logo',
        titulo: 'Enviar o logo da empresa',
        detalhe: 'aparece no sistema e nas folhas impressas',
        feito: Boolean(db.configuracoes.logo_url),
        to: '/configuracoes?aba=empresa',
      },
      {
        id: 'nuvem',
        titulo: 'Conectar a nuvem',
        detalhe: 'para a equipe toda ver os mesmos pedidos em qualquer aparelho',
        feito: nuvem,
        to: '/configuracoes?aba=nuvem',
      },
      {
        id: 'pedido',
        titulo: 'Registrar o primeiro pedido',
        detalhe: 'cliente, metragem e o valor já sai calculado',
        feito: db.pedidos.length > 0,
        to: '/pedido/novo',
      },
    ],
    [db.configuracoes.logo_url, db.pedidos.length, db.vendedores.length, faixas, nuvem],
  )

  const pendentes = passos.filter((p) => !p.feito)
  const feitos = passos.length - pendentes.length

  /* ------------------------------ equipe em tabela ------------------------------ */

  const mesAtual = hoje.slice(0, 7)
  const equipe = useMemo(() => {
    return db.vendedores
      .map((conta) => {
        const meus = db.pedidos.filter((p) => p.vendedor_id === conta.id)
        const noMes = meus.filter((p) => dataPagamento(p).startsWith(mesAtual))
        const concluidos = filasDaComissao(noMes)
        const ultima = meus
          .map((p) => p.data_pedido)
          .filter(Boolean)
          .sort()
          .pop()
        return {
          conta,
          pedidos: noMes.length,
          faturamento: concluidos.reduce((s, p) => s + Number(p.valor || 0), 0),
          comissao: calcularComissao(concluidos, faixas, semMetragem).total,
          ultima: ultima ?? null,
        }
      })
      .sort((a, b) => b.faturamento - a.faturamento || a.conta.nome.localeCompare(b.conta.nome))
  }, [db.pedidos, db.vendedores, faixas, mesAtual, semMetragem])

  const ranking = useMemo(
    () =>
      comissaoPorVendedor(pagos, faixas, semMetragem)
        .map((l) => ({
          ...l,
          vendedor: vendedorPorId(l.chave),
        }))
        .sort((a, b) => b.faturamento - a.faturamento),
    [faixas, pagos, semMetragem, vendedorPorId],
  )

  const maiorFaturamento = Math.max(1, ...ranking.map((r) => r.faturamento))

  /** os atalhos caem direto na fila certa dentro de Pedidos */
  const atalhos = [
    { label: 'Em andamento', valor: emAndamento.length, icone: RotateCcw, to: '/pedidos?filtro=em_andamento', cor: 'from-sky-500 to-blue-600' },
    { label: 'A pagar', valor: aPagar.length, icone: Wallet, to: '/pedidos?filtro=a_pagar', cor: 'from-amber-500 to-orange-600' },
    { label: 'Concluídas', valor: concluidas.length, icone: CheckCircle2, to: '/pedidos?filtro=concluida', cor: 'from-emerald-500 to-green-600' },
    { label: 'A entregar', valor: aEntregar.length, icone: PackageCheck, to: '/pedidos?filtro=concluida', cor: 'from-violet-500 to-indigo-600' },
  ]

  /** botões grandes: o que o chefe faz todos os dias, em um toque */
  const acoesGrandes = [
    { label: 'Novo pedido', sub: 'registrar uma fila', icone: Plus, cor: 'from-pink-500 to-purple-600', to: '/pedido/novo' },
    { label: 'A receber', sub: moeda(aReceberTodos), icone: Wallet, cor: 'from-violet-500 to-indigo-600', to: '/pedidos?filtro=a_pagar' },
    { label: 'Na máquina', sub: `${resumoHoje.naFila} fila(s)`, icone: Printer, cor: 'from-sky-500 to-blue-600', to: '/pedidos?filtro=em_andamento' },
    { label: 'Equipe', sub: `${db.vendedores.length} funcionário(s)`, icone: Users, cor: 'from-amber-500 to-orange-600', to: '/configuracoes?aba=equipe' },
    { label: 'Relatório', sub: 'comissões e faturamento', icone: BarChart3, cor: 'from-emerald-500 to-green-600', to: '/relatorio' },
  ]

  const numerosDeHoje = [
    { label: 'Criados hoje', valor: resumoHoje.criados, sub: moeda(resumoHoje.valorCriado), icone: Package, cor: 'from-pink-500 to-purple-600', to: '/pedidos' },
    { label: 'Pagos hoje', valor: resumoHoje.pagos, sub: 'baixa do dia', icone: Wallet, cor: 'from-emerald-500 to-green-600', to: '/relatorio' },
    { label: 'Na fila agora', valor: resumoHoje.naFila, sub: 'ainda na máquina', icone: Printer, cor: 'from-sky-500 to-blue-600', to: '/pedidos?filtro=em_andamento' },
    { label: 'Concluídos hoje', valor: resumoHoje.concluidos, sub: 'saíram da máquina', icone: CheckCircle2, cor: 'from-indigo-500 to-violet-600', to: '/pedidos?filtro=concluida' },
    { label: 'Entregues hoje', valor: resumoHoje.entregues, sub: 'cliente recebeu', icone: PackageCheck, cor: 'from-teal-500 to-emerald-600', to: '/pedidos?filtro=entregue' },
    {
      label: 'Parados 3+ dias',
      valor: resumoHoje.parados,
      sub: resumoHoje.parados ? 'precisa de atenção' : 'tudo em dia',
      icone: TriangleAlert,
      cor: resumoHoje.parados ? 'from-amber-500 to-orange-600' : 'from-slate-400 to-slate-500',
      to: '/pedidos?filtro=em_andamento',
    },
  ]

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

      {/* ------------------------------- resumo de hoje ------------------------------- */}
      <Cartao hover={false} className="mb-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Resumo de hoje</h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{dataBR(hoje)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {numerosDeHoje.map(({ label, valor, sub, icone: Icone, cor, to }) => (
            <button
              key={label}
              onClick={() => navegar(to)}
              className="flex items-center gap-2 rounded-xl border border-slate-100 p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800"
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white', cor)}>
                <Icone className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {label}
                </span>
                <span className="block text-lg font-black leading-tight text-slate-800 dark:text-slate-100">{valor}</span>
                <span className="block truncate text-[11px] text-slate-400 dark:text-slate-500">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </Cartao>

      {/* --------------------------- atalhos grandes do dia --------------------------- */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {acoesGrandes.map(({ label, sub, icone: Icone, cor, to }) => (
          <button
            key={label}
            onClick={() => navegar(to)}
            className="group flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-hover dark:border-slate-800 dark:bg-slate-900 dark:shadow-dark-soft"
          >
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', cor)}>
              <Icone className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{label}</span>
              <span className="block truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* --------------------------- checklist de primeiros passos --------------------------- */}
      {pendentes.length ? (
        <Cartao hover={false} className="mb-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Primeiros passos</h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {feitos} de {passos.length} prontos — some daqui quando terminar
            </span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 transition-all"
              style={{ width: `${Math.round((feitos / passos.length) * 100)}%` }}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {passos.map(({ id, titulo, detalhe, feito, to }) => (
              <div
                key={id}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-2.5',
                  feito
                    ? 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30'
                    : 'border-slate-100 dark:border-slate-800',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    feito
                      ? 'bg-emerald-500 text-white'
                      : 'border-2 border-dashed border-slate-300 text-transparent dark:border-slate-600',
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">{titulo}</span>
                  <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{detalhe}</span>
                </span>
                {feito ? (
                  <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">pronto</span>
                ) : (
                  <Botao tamanho="sm" variante="secundario" onClick={() => navegar(to)}>
                    Abrir
                  </Botao>
                )}
              </div>
            ))}
          </div>
        </Cartao>
      ) : null}

      <Abas
        ativa={periodo}
        onChange={setPeriodo}
        abas={[
          { id: 'mes', label: 'Este mês' },
          { id: '30', label: 'Últimos 30 dias' },
          { id: '90', label: 'Últimos 90 dias' },
          { id: 'tudo', label: 'Todo o período' },
        ]}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo
          titulo="Pedidos pagos"
          valor={pagos.length}
          icone={Package}
          gradiente="from-pink-500 to-purple-600"
          sub={`${pedidosPeriodo.length} pedidos no período`}
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
        <CartaoResumo
          titulo="A receber (total)"
          valor={moeda(aReceberTodos)}
          icone={Wallet}
          gradiente="from-violet-500 to-indigo-600"
          sub="pedidos pendentes ou parciais"
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
                <div key={linha.chave} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white',
                        i === 0
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                          : 'bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {linha.vendedor?.nome ?? 'Sem vendedor'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {linha.pedidos} pedido(s) • {numeroBR(linha.metragem)} m
                    </span>
                    <span className="ml-auto text-right">
                      <span className="block text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {moeda(linha.faturamento)}
                      </span>
                      <span className="block text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        comissão {moeda(linha.resultado.total)} ({numeroBR(linha.resultado.percentualMedio, 2)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600"
                      style={{ width: `${Math.max(4, (linha.faturamento / maiorFaturamento) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
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
            <h2 className="mb-3 text-base font-extrabold text-slate-800 dark:text-slate-100">O que precisa de atenção</h2>
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
          </Cartao>

          <Cartao hover={false}>
            <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
              <Percent className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Comissão por faixa (período)
            </h2>
            <div className="space-y-2">
              {[...comissao.porFaixa, comissao.semMetragem]
                .filter((l) => l.pedidos > 0)
                .map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {l.rotulo} <b className="text-purple-600 dark:text-purple-400">{numeroBR(l.percentual, 1)}%</b>
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{moeda(l.comissao)}</span>
                  </div>
                ))}
              {!comissao.porFaixa.some((l) => l.pedidos > 0) && comissao.semMetragem.pedidos === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum pedido pago no período.</p>
              ) : null}
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

      {/* --------------------------- equipe em formato de tabela --------------------------- */}
      <Cartao hover={false} className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Funcionários · mês atual</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {db.vendedores.length} funcionário(s) • {db.clientes.length} cliente(s) •{' '}
              {db.usuarios.length} login(s) de proprietário
            </p>
          </div>
          <Botao tamanho="sm" variante="secundario" icone={Users} onClick={() => navegar('/configuracoes?aba=equipe')}>
            Funcionários e acessos
          </Botao>
        </div>

        <div className="overflow-x-auto">
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
