import {
  ArrowRight,
  BellRing,
  CalendarDays,
  ClipboardList,
  History,
  Package,
  Percent,
  Plus,
  Printer,
  Store,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { Botao, Cartao, CartaoResumo, TituloPagina, Vazio, cn } from '../components/ui'
import { calcularComissao } from '../lib/comissao'
import { dataBR, hojeISO, moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { FAIXAS_PADRAO, filasDaComissao, isPedidoCompleto, pedidoPendenteFinanceiro, telasDoUsuario } from '../lib/types'

/** Área inicial de quem vende: só o que é dele */
export default function MinhaArea() {
  const { db, nomeVendedor } = useStore()
  const { usuario, vendedorNome } = useAuth()
  const telas = telasDoUsuario(usuario)
  const acoes = useAcoesPedido()
  const navegar = useNavigate()

  const faixas = db.configuracoes.faixas_comissao?.length ? db.configuracoes.faixas_comissao : FAIXAS_PADRAO
  const semMetragem = db.configuracoes.comissao_sem_metragem ?? 0

  const meusPedidos = useMemo(
    () =>
      db.pedidos
        .filter((p) => p.vendedor_id === usuario?.vendedor_id)
        .sort((a, b) => b.numero - a.numero),
    [db.pedidos, usuario?.vendedor_id],
  )

  const mesAtual = new Date().toISOString().slice(0, 7)

  const doMes = useMemo(
    () =>
      meusPedidos.filter((p) =>
        (p.data_pagamento || (p.data_pedido || '').slice(0, 10)).startsWith(mesAtual),
      ),
    [mesAtual, meusPedidos],
  )

  /** como no relatório: só as filas concluídas no mês contam para a comissão */
  const naConta = filasDaComissao(doMes)
  const comissao = calcularComissao(naConta, faixas, semMetragem)
  const aReceber = meusPedidos.filter(pedidoPendenteFinanceiro).reduce((s, p) => s + Number(p.valor || 0), 0)
  /** filas que já saíram da máquina e ainda não foram entregues: é hora de avisar o cliente */
  const avisos = meusPedidos.filter((p) => p.estagio === 'concluido' && !p.entregue).slice(0, 6)
  const aguardandoImpressao = meusPedidos.filter((p) => p.estagio !== 'concluido').length

  const recentes = meusPedidos.slice(0, 6)

  /** as filas que saíram da máquina hoje */
  const meuDia = useMemo(() => {
    const hoje = hojeISO()
    const filas = meusPedidos.filter((p) => p.estagio === 'concluido' && (p.iniciado_em || '').slice(0, 10) === hoje)
    return {
      total: filas.length,
      metros: filas.reduce((s, p) => s + Number(p.metragem || 0), 0),
      valor: filas.reduce((s, p) => s + Number(p.valor || 0), 0),
    }
  }, [meusPedidos])

  return (
    <>
      <TituloPagina
        titulo={`Olá, ${usuario?.nome ?? ''}!`}
        subtitulo={`Sua área — pedidos, avisos e comissão de ${vendedorNome}.`}
        acoes={
          <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
            Novo pedido
          </Botao>
        }
      />

      {avisos.length ? (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-soft dark:border-amber-900 dark:from-amber-950/50 dark:to-orange-950/40">
          <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-amber-900 dark:text-amber-200">
            <BellRing className="h-4 w-4" />
            {avisos.length} fila(s) sua(s) já {avisos.length === 1 ? 'saiu' : 'saíram'} da máquina — pode entregar!
          </p>
          <div className="flex flex-wrap gap-2">
            {avisos.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-amber-900 dark:bg-slate-900/80 dark:text-slate-200"
              >
                #{p.numero} {p.cliente_nome} • {moeda(p.valor)}
                <button
                  onClick={() => {
                    void acoes.alternarPasso(p, 'entregue').catch(() => {})
                  }}
                  className="rounded-lg bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase text-white"
                >
                  entreguei
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo
          titulo="Meus pedidos"
          valor={meusPedidos.length}
          icone={ClipboardList}
          gradiente="from-pink-500 to-purple-600"
          sub={`${doMes.length} neste mês`}
        />
        <CartaoResumo
          titulo="Faturamento do mês"
          valor={moeda(naConta.reduce((s, p) => s + Number(p.valor || 0), 0))}
          icone={TrendingUp}
          gradiente="from-emerald-500 to-green-600"
          sub={`${naConta.length} fila(s) concluída(s)`}
        />
        <CartaoResumo
          titulo="Minha comissão"
          valor={moeda(comissao.total)}
          icone={Percent}
          gradiente="from-amber-500 to-orange-600"
          sub={`${numeroBR(comissao.percentualMedio, 2)}% médio`}
        />
        <CartaoResumo
          titulo="A receber"
          valor={moeda(aReceber)}
          icone={Wallet}
          gradiente="from-violet-500 to-indigo-600"
          sub={`${aguardandoImpressao} na fila de impressão`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao className="lg:col-span-2" hover={false}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Meus últimos pedidos</h2>
            <Botao tamanho="sm" variante="secundario" icone={ClipboardList} onClick={() => navegar('/pedidos')}>
              Ver todos
            </Botao>
          </div>

          {recentes.length === 0 ? (
            <Vazio
              icone={Package}
              titulo="Você ainda não tem pedidos"
              descricao="Crie o primeiro pedido para começar."
              acao={
                <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
                  Novo pedido
                </Botao>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {recentes.map((p) => (
                <PedidoCartao
                  key={p.id}
                  pedido={p}
                  mostrarVendedor={false}
                  acoes={
                    <Botao tamanho="sm" variante="secundario" onClick={() => acoes.editar(p)}>
                      Abrir
                    </Botao>
                  }
                />
              ))}
            </div>
          )}
        </Cartao>

        <div className="space-y-4">
          {meuDia.total > 0 || telas.paraImprimir || telas.relatorio ? (
            <Cartao hover={false}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
                <History className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Minhas filas de hoje
              </h2>
              {meuDia.total ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Filas concluídas hoje</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{meuDia.total}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Metros concluídos</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{numeroBR(meuDia.metros)} m</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Valor das filas</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{moeda(meuDia.valor)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Nenhuma fila sua foi concluída hoje ainda.
                </p>
              )}
              {telas.paraImprimir ? (
                <Botao
                  className="mt-3 justify-start"
                  variante="secundario"
                  icone={Printer}
                  onClick={() => navegar('/pedidos')}
                >
                  Abrir a fila de impressão
                </Botao>
              ) : null}
              <Botao
                className="mt-2 justify-start"
                variante="secundario"
                icone={ClipboardList}
                onClick={() => navegar('/pedidos?filtro=concluida')}
              >
                Ver as filas concluídas
              </Botao>
            </Cartao>
          ) : null}

          <Cartao hover={false}>
            <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
              <Percent className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Comissão do mês por faixa
            </h2>
            {comissao.porFaixa.filter((l) => l.pedidos > 0).length || comissao.semMetragem.pedidos ? (
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
                <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-sm dark:border-slate-700">
                  <span className="font-bold text-slate-600 dark:text-slate-300">Total do mês</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {moeda(comissao.total)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Nenhum pedido pago neste mês ainda.
              </p>
            )}
          </Cartao>

          <Cartao hover={false}>
            <h2 className="mb-3 text-base font-extrabold text-slate-800 dark:text-slate-100">Atalhos</h2>
            <div className="grid gap-2">
              <Botao
                variante="secundario"
                icone={UserCheck}
                className="justify-start"
                onClick={() => navegar('/relatorio')}
              >
                Meu desempenho por período
              </Botao>
              <Botao variante="secundario" icone={Users} className="justify-start" onClick={() => navegar('/clientes')}>
                Meus clientes
              </Botao>
              <Botao variante="secundario" icone={Store} className="justify-start" onClick={() => navegar('/pedidos')}>
                Pedidos para retirada
              </Botao>
            </div>
          </Cartao>

          <Cartao hover={false}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Hoje é
            </p>
            <p className="flex items-center gap-2 text-lg font-extrabold text-slate-800 dark:text-slate-100">
              <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              {dataBR(hojeISO())}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {meusPedidos.filter(isPedidoCompleto).length} pedido(s) seus já estão prontos e pagos.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" /> {meusPedidos.filter((p) => p.tipo_entrega === 'correios').length}{' '}
                Correios
              </span>
              <span className="inline-flex items-center gap-1">
                <Printer className="h-3.5 w-3.5" /> {aguardandoImpressao} na fila
              </span>
              <span className={cn('inline-flex items-center gap-1')}>
                <ArrowRight className="h-3.5 w-3.5" /> vendedor: {nomeVendedor(usuario?.vendedor_id)}
              </span>
            </div>
          </Cartao>
        </div>
      </div>
      {acoes.dialog}
    </>
  )
}
