import {
  BarChart3,
  ClipboardList,
  Crown,
  Package,
  PackageCheck,
  Percent,
  Printer,
  RotateCcw,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Abas, Botao, Cartao, CartaoResumo, TituloPagina, cn } from '../components/ui'
import { calcularComissao, comissaoPorVendedor } from '../lib/comissao'
import { dataBR, hojeISO, moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { FAIXAS_PADRAO, pedidoPendenteFinanceiro, type Pedido } from '../lib/types'

const primeiroDiaDoMes = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const dataPagamento = (p: Pedido) => p.data_pagamento || (p.data_pedido || '').slice(0, 10)

/** Painel do proprietário: tudo, de todos */
export default function Painel() {
  const { db, nomeVendedor, vendedorPorId } = useStore()
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
  const aImprimir = db.pedidos.filter((p) => !p.iniciado_em && p.estagio !== 'concluido')
  const imprimindo = db.pedidos.filter((p) => p.iniciado_em && p.estagio !== 'concluido')
  const aEntregar = db.pedidos.filter((p) => p.estagio === 'concluido' && !p.entregue)

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
    { label: 'A pagar', valor: aPagar.length, icone: Wallet, to: '/pedidos?filtro=a_pagar', cor: 'from-amber-500 to-orange-600' },
    { label: 'A imprimir', valor: aImprimir.length, icone: Printer, to: '/pedidos?filtro=a_imprimir', cor: 'from-sky-500 to-blue-600' },
    { label: 'Imprimindo agora', valor: imprimindo.length, icone: RotateCcw, to: '/pedidos?filtro=imprimindo', cor: 'from-fuchsia-500 to-pink-600' },
    { label: 'A entregar', valor: aEntregar.length, icone: PackageCheck, to: '/pedidos?filtro=concluida', cor: 'from-violet-500 to-indigo-600' },
  ]

  return (
    <>
      <TituloPagina
        icone={Crown}
        titulo={`Painel do proprietário`}
        subtitulo={`Visão geral de tudo — ${usuario?.nome ?? ''} • hoje é ${dataBR(hojeISO())}`}
        acoes={
          <>
            <Botao variante="secundario" icone={Users} onClick={() => navegar('/configuracoes')}>
              Equipe
            </Botao>
            <Botao variante="secundario" icone={BarChart3} onClick={() => navegar('/relatorio')}>
              Relatório
            </Botao>
            <Botao icone={ClipboardList} onClick={() => navegar('/pedidos')}>
              Todos os pedidos
            </Botao>
          </>
        }
      />

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
                      onClick={() => navegar(`/por-vendedor?vendedor=${linha.chave}`)}
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
              onClick={() => navegar('/configuracoes')}
            >
              Ajustar regras de comissão
            </Botao>
          </Cartao>

          <Cartao hover={false}>
            <h2 className="mb-3 text-base font-extrabold text-slate-800 dark:text-slate-100">Equipe</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {db.vendedores.length} vendedor(es) cadastrado(s) • {db.clientes.length} cliente(s) •{' '}
              {db.usuarios.length} acesso(s)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Botao tamanho="sm" variante="secundario" icone={Users} onClick={() => navegar('/configuracoes')}>
                Gerenciar equipe
              </Botao>
              <Botao tamanho="sm" variante="secundario" icone={Settings} onClick={() => navegar('/configuracoes')}>
                Configurações
              </Botao>
            </div>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Últimos vendedores: {db.vendedores.slice(0, 4).map((v) => v.nome).join(', ') || '—'}
              {db.vendedores.length > 4 ? '…' : ''}
            </p>
          </Cartao>
        </div>
      </div>
    </>
  )
}
