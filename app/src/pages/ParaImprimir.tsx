import { CheckCircle2, Clock, Pencil, Printer, PrinterCheck, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { Botao, CartaoResumo, Etiqueta, TituloPagina, Vazio } from '../components/ui'
import { dataBR, moeda } from '../lib/format'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { LABEL_PRODUCAO } from '../lib/types'

export default function ParaImprimir() {
  const { db, nomeVendedor } = useStore()
  const { ehProprietario } = useAuth()
  const acoes = useAcoesPedido()
  /** sem valores em dinheiro para quem não é o proprietário */
  const verValores = ehProprietario

  const fila = useMemo(
    () =>
      db.pedidos
        .filter((p) => p.status_pagamento === 'pago' && !p.impresso && p.status_producao !== 'dtf_pronto')
        .sort((a, b) => a.data_pedido.localeCompare(b.data_pedido)),
    [db.pedidos],
  )

  const impressosHoje = useMemo(
    () =>
      db.pedidos.filter(
        (p) => p.impresso_em && new Date(p.impresso_em).toDateString() === new Date().toDateString(),
      ),
    [db.pedidos],
  )

  const ultimos = useMemo(
    () =>
      db.pedidos
        .filter((p) => p.impresso && p.impresso_em)
        .sort((a, b) => String(b.impresso_em).localeCompare(String(a.impresso_em)))
        .slice(0, 6),
    [db.pedidos],
  )

  const metrosFila = fila.reduce((s, p) => s + Number(p.metragem || 0), 0)
  const valorFila = fila.reduce((s, p) => s + Number(p.valor || 0), 0)

  return (
    <>
      <TituloPagina
        icone={Printer}
        titulo="Para imprimir"
        subtitulo="Somente pedidos com pagamento confirmado que ainda não foram impressos."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo titulo="Na fila" valor={fila.length} icone={Printer} gradiente="from-fuchsia-500 to-pink-600" />
        <CartaoResumo
          titulo="Metragem na fila"
          valor={`${metrosFila.toFixed(2).replace('.', ',')} m`}
          icone={Clock}
          gradiente="from-sky-500 to-blue-600"
        />
        {verValores ? (
          <CartaoResumo titulo="Valor na fila" valor={moeda(valorFila)} icone={Wallet} gradiente="from-violet-500 to-indigo-600" />
        ) : (
          <CartaoResumo
            titulo="Fila do dia"
            valor={fila.filter((p) => (p.data_pedido || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length}
            icone={Clock}
            gradiente="from-amber-500 to-orange-600"
          />
        )}
        <CartaoResumo
          titulo="Impressos hoje"
          valor={impressosHoje.length}
          icone={CheckCircle2}
          gradiente="from-emerald-500 to-green-600"
        />
      </div>

      {fila.length === 0 ? (
        <Vazio
          icone={PrinterCheck}
          titulo="Nenhum pedido aguardando impressão"
          descricao="Quando um pedido for marcado como pago, ele aparece aqui automaticamente."
        />
      ) : (
        <div className="space-y-3">
          {fila.map((p) => (
            <PedidoCartao
        mostrarValor={verValores}
              key={p.id}
              pedido={p}
              extras={
                <Etiqueta className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" icone={Clock}>
                  {LABEL_PRODUCAO[p.status_producao]}
                </Etiqueta>
              }
              acoes={
                <>
                  <Botao tamanho="sm" variante="sucesso" icone={PrinterCheck} onClick={() => acoes.marcarImpresso(p)}>
                    Marcar como impresso
                  </Botao>
                  <Botao tamanho="sm" variante="secundario" icone={Pencil} onClick={() => acoes.editar(p)}>
                    Editar
                  </Botao>
                </>
              }
            />
          ))}
        </div>
      )}

      {ultimos.length ? (
        <div className="mt-8">
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Últimos impressos</p>
          <div className="space-y-2">
            {ultimos.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white/70 px-4 py-2.5 text-sm text-slate-500"
              >
                <span className="font-extrabold text-slate-700">#{p.numero}</span>
                <span className="font-semibold text-slate-600">{p.cliente_nome}</span>
                <span className="text-xs">{nomeVendedor(p.vendedor_id)}</span>
                <span className="ml-auto text-xs">
                  impresso em {dataBR(p.impresso_em)}
                  {verValores ? ` • ${moeda(p.valor)}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {acoes.dialog}
    </>
  )
}
