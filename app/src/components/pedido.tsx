import { CalendarDays, MapPin, Printer, Star, Store, Truck, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { dataBR, dataHoraBR, hojeISO, moeda, metros } from '../lib/format'
import { useStore } from '../lib/store'
import { isPedidoCompleto, type Pedido } from '../lib/types'
import { EtiquetaPagamento, EtiquetaProducao } from './StatusBadges'
import { Etiqueta, cn, useConfirmacao } from './ui'

/** Cartão de pedido usado nas listas */
export function PedidoCartao({
  pedido,
  acoes,
  extras,
  mostrarVendedor = true,
  mostrarEntrega = true,
  mostrarValor = true,
}: {
  pedido: Pedido
  acoes?: ReactNode
  extras?: ReactNode
  mostrarVendedor?: boolean
  mostrarEntrega?: boolean
  /** usado nas telas de produção/entrega liberadas para quem não é o proprietário */
  mostrarValor?: boolean
}) {
  const { nomeVendedor } = useStore()
  const pronto = isPedidoCompleto(pedido)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-hover sm:gap-4',
        pronto ? 'border-emerald-100' : 'border-slate-100',
      )}
    >
      <div className="min-w-[190px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-2 py-0.5 text-xs font-black text-white">
            #{pedido.numero}
          </span>
          <span className="truncate text-base font-extrabold text-slate-800">{pedido.cliente_nome}</span>
          {pedido.tipo_entrega === 'correios' ? (
            <Etiqueta className="border-sky-200 bg-sky-50 text-sky-700" icone={Truck}>
              Correios
            </Etiqueta>
          ) : (
            <Etiqueta className="border-violet-200 bg-violet-50 text-violet-700" icone={Store}>
              Retirada
            </Etiqueta>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {pedido.descricao ? pedido.descricao : 'Sem descrição'} • {metros(pedido.metragem)}
          {mostrarVendedor ? ` • ${nomeVendedor(pedido.vendedor_id)}` : ''}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {dataHoraBR(pedido.data_pedido)}
          </span>
          {mostrarEntrega && pedido.cidade ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {pedido.cidade}/{pedido.estado}
            </span>
          ) : null}
          {mostrarEntrega && pedido.codigo_rastreio ? <span>Rastreio: {pedido.codigo_rastreio}</span> : null}
          {mostrarEntrega && pedido.retirado_por ? <span>Retirado por {pedido.retirado_por}</span> : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <EtiquetaProducao status={pedido.status_producao} />
        <EtiquetaPagamento status={pedido.status_pagamento} />
      </div>

      {mostrarValor ? (
        <div className="w-[110px] text-right">
          <p className="text-base font-extrabold text-slate-800">{moeda(pedido.valor)}</p>
          <p className="text-[11px] text-slate-400">
            {pedido.data_pagamento ? `Pago em ${dataBR(pedido.data_pagamento)}` : pedido.forma_pagamento || '—'}
          </p>
        </div>
      ) : null}

      {extras}

      {acoes ? <div className="flex flex-wrap items-center gap-1.5">{acoes}</div> : null}
    </div>
  )
}

/** Ações reutilizadas nas telas (editar, excluir, marcar impresso/pago/entregue/retirado) */
export function useAcoesPedido() {
  const { atualizarPedido, excluirPedido, nomeVendedor, avisar } = useStore()
  const navegar = useNavigate()
  const { confirmar, dialog } = useConfirmacao()

  const editar = (p: Pedido) => navegar(`/pedido/${p.id}`)

  const pedirExclusao = async (p: Pedido) => {
    const ok = await confirmar({
      titulo: `Excluir o pedido #${p.numero}?`,
      mensagem: (
        <>
          O pedido de <b>{p.cliente_nome}</b> ({moeda(p.valor)}) será excluído junto com os arquivos de arte enviados.
          Essa ação não pode ser desfeita.
        </>
      ),
    })
    if (ok) await excluirPedido(p.id)
  }

  const marcarImpresso = async (p: Pedido) => {
    const agora = new Date().toISOString()
    await atualizarPedido(p.id, {
      impresso: true,
      impresso_em: agora,
      status_producao: 'dtf_pronto',
      aviso_visto: false,
    })
    avisar(`Pedido #${p.numero} marcado como impresso. ${nomeVendedor(p.vendedor_id)} será avisado!`)
  }

  const marcarPago = async (p: Pedido) => {
    await atualizarPedido(p.id, {
      status_pagamento: 'pago',
      data_pagamento: p.data_pagamento || hojeISO(),
      status_producao: p.status_producao === 'pagamento' ? 'imprimir' : p.status_producao,
    })
    avisar(`Pagamento do pedido #${p.numero} confirmado!`)
  }

  const marcarEntregue = async (p: Pedido) => {
    await atualizarPedido(p.id, {
      data_entrega: hojeISO(),
      data_envio: p.data_envio || hojeISO(),
    })
    avisar(`Pedido #${p.numero} marcado como entregue!`)
  }

  const marcarRetirado = async (p: Pedido, quem: string) => {
    if (!quem.trim()) {
      avisar('Informe quem retirou o pedido.', 'erro')
      return
    }
    await atualizarPedido(p.id, { retirado_por: quem.trim(), data_retirada: p.data_retirada || hojeISO() })
    avisar(`Retirada do pedido #${p.numero} registrada!`)
  }

  const marcarVisto = async (p: Pedido) => {
    await atualizarPedido(p.id, { aviso_visto: true })
  }

  const atualizar = async (p: Pedido, patch: Partial<Pedido>, mensagem?: string) => {
    await atualizarPedido(p.id, patch)
    if (mensagem) avisar(mensagem)
  }

  const salvarRastreio = async (p: Pedido, codigo: string) => {
    await atualizarPedido(p.id, {
      codigo_rastreio: codigo.trim(),
      data_envio: p.data_envio || hojeISO(),
    })
    avisar(`Código de rastreio do pedido #${p.numero} salvo!`)
  }

  return {
    editar,
    pedirExclusao,
    marcarImpresso,
    marcarPago,
    marcarEntregue,
    marcarRetirado,
    marcarVisto,
    atualizar,
    salvarRastreio,
    dialog,
  }
}

export const IconeVendedor = User
export const IconeEspecial = Star
export const IconeImpressora = Printer
