import {
  BadgeCheck,
  BellRing,
  CalendarRange,
  ClipboardList,
  Package,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { Botao, Campo, CartaoResumo, Entrada, Selecao, TituloPagina, Vazio, cn } from '../components/ui'
import { calcularComissao } from '../lib/comissao'
import { dataBR, fimDoDia, hojeISO, inicioDoDia, moeda } from '../lib/format'
import { useStore } from '../lib/store'
import { FAIXAS_PADRAO, type Pedido } from '../lib/types'

type Periodo = '7' | '30' | '90' | 'personalizado'

export default function PorVendedor() {
  const { db } = useStore()
  const acoes = useAcoesPedido()
  const navegar = useNavigate()
  const faixas = db.configuracoes.faixas_comissao?.length ? db.configuracoes.faixas_comissao : FAIXAS_PADRAO
  const semMetragem = db.configuracoes.comissao_sem_metragem ?? 0

  const [vendedorId, setVendedorId] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('30')
  const [inicio, setInicio] = useState(hojeISO())
  const [fim, setFim] = useState(hojeISO())

  useEffect(() => {
    if (!vendedorId && db.vendedores.length) setVendedorId(db.vendedores[0].id)
  }, [db.vendedores, vendedorId])

  const [de, ate] = useMemo(() => {
    if (periodo === 'personalizado') {
      return [inicio ? inicioDoDia(new Date(`${inicio}T00:00`)) : new Date(0), fim ? fimDoDia(new Date(`${fim}T00:00`)) : new Date()]
    }
    const dias = Number(periodo)
    const f = new Date()
    const d = new Date()
    d.setDate(d.getDate() - dias)
    return [d, f]
  }, [fim, inicio, periodo])

  const pedidos = useMemo(() => {
    const ini = de.getTime()
    const f = ate.getTime()
    return db.pedidos
      .filter((p) => p.vendedor_id === vendedorId)
      .filter((p) => {
        const t = new Date(p.data_pedido).getTime()
        return t >= ini && t <= f
      })
      .sort((a, b) => b.numero - a.numero)
  }, [ate, db.pedidos, de, vendedorId])

  const avisos = useMemo(
    () => db.pedidos.filter((p) => p.vendedor_id === vendedorId && p.impresso && !p.aviso_visto),
    [db.pedidos, vendedorId],
  )

  const total = pedidos.reduce((s, p) => s + Number(p.valor || 0), 0)
  const pedidosPagos = pedidos.filter((p) => p.status_pagamento === 'pago')
  const pago = pedidosPagos.reduce((s, p) => s + Number(p.valor || 0), 0)
  const metragem = pedidos.reduce((s, p) => s + Number(p.metragem || 0), 0)
  const comissao = calcularComissao(pedidosPagos, faixas, semMetragem)

  const nome = db.vendedores.find((v) => v.id === vendedorId)?.nome ?? '—'

  if (!db.vendedores.length) {
    return (
      <>
        <TituloPagina icone={UserCheck} titulo="Por vendedor" subtitulo="Acompanhe as vendas de cada vendedor." />
        <Vazio
          icone={UserCheck}
          titulo="Nenhum vendedor cadastrado"
          descricao="Cadastre um vendedor para acompanhar os pedidos dele."
          acao={
            <Botao icone={Plus} onClick={() => navegar('/vendedores')}>
              Cadastrar vendedor
            </Botao>
          }
        />
      </>
    )
  }

  return (
    <>
      <TituloPagina
        icone={UserCheck}
        titulo="Por vendedor"
        subtitulo="Escolha o vendedor e acompanhe o desempenho dele no período."
        acoes={
          <Botao icone={Plus} onClick={() => navegar(`/pedido/novo?vendedor=${vendedorId}`)}>
            Novo pedido de {nome}
          </Botao>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Vendedor">
          <Selecao value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
            {db.vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo label="Período">
          <Selecao value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="personalizado">Datas personalizadas</option>
          </Selecao>
        </Campo>
        {periodo === 'personalizado' ? (
          <>
            <Campo label="De">
              <Entrada type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </Campo>
            <Campo label="Até">
              <Entrada type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </Campo>
          </>
        ) : (
          <div className="flex items-end">
            <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500">
              <CalendarRange className="h-4 w-4 text-purple-600" />
              {dataBR(de.toISOString())} até {dataBR(ate.toISOString())}
            </p>
          </div>
        )}
      </div>

      {avisos.length ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-soft">
          <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-amber-900">
            <BellRing className="h-4 w-4" />
            {avisos.length} pedido(s) de {nome} já {avisos.length === 1 ? 'foi impresso' : 'foram impressos'}!
          </p>
          <div className="space-y-2">
            {avisos.map((p: Pedido) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-white/80 p-2.5"
              >
                <span className="text-sm font-bold text-slate-700">
                  #{p.numero} {p.cliente_nome}
                </span>
                <span className="text-xs text-slate-500">
                  DTF pronto • {moeda(p.valor)} • avisado em {dataBR(p.impresso_em)}
                </span>
                <Botao
                  tamanho="sm"
                  variante="sucesso"
                  icone={BadgeCheck}
                  className="ml-auto"
                  onClick={() => acoes.marcarVisto(p)}
                >
                  Ok, vi o aviso
                </Botao>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo titulo="Pedidos" valor={pedidos.length} icone={ClipboardList} gradiente="from-pink-500 to-purple-600" />
        <CartaoResumo titulo="Valor total" valor={moeda(total)} icone={Package} gradiente="from-violet-500 to-indigo-600" />
        <CartaoResumo titulo="Valor pago" valor={moeda(pago)} icone={Wallet} gradiente="from-emerald-500 to-green-600" />
        <CartaoResumo
          titulo="Metragem"
          valor={`${metragem.toFixed(2).replace('.', ',')} m`}
          icone={CalendarRange}
          gradiente="from-sky-500 to-blue-600"
        />
      </div>

      <p className={cn('mb-3 text-sm font-semibold text-slate-500', !pedidos.length && 'hidden')}>
        {pedidos.length} pedido(s) de {nome} no período • comissão sobre os pedidos pagos:{' '}
        <span className="font-bold text-emerald-600">{moeda(comissao.total)}</span>{' '}
        <span className="text-xs text-slate-400">
          (percentual médio {comissao.percentualMedio.toFixed(2).replace('.', ',')}%)
        </span>
      </p>

      {pedidos.length === 0 ? (
        <Vazio
          icone={ClipboardList}
          titulo={`${nome} não tem pedidos neste período`}
          descricao="Troque o período ou crie um novo pedido para este vendedor."
          acao={
            <Botao icone={Plus} onClick={() => navegar(`/pedido/novo?vendedor=${vendedorId}`)}>
              Novo pedido
            </Botao>
          }
        />
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => (
            <PedidoCartao
              key={p.id}
              pedido={p}
              mostrarVendedor={false}
              acoes={
                <>
                  <Botao tamanho="sm" variante="secundario" icone={Pencil} onClick={() => acoes.editar(p)}>
                    Editar
                  </Botao>
                  {p.status_pagamento !== 'pago' ? (
                    <Botao tamanho="sm" variante="sucesso" icone={Wallet} onClick={() => acoes.marcarPago(p)}>
                      Marcar pago
                    </Botao>
                  ) : null}
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
