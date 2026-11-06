import { CalendarDays, MapPin, Printer, Star, Store, Truck, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { dataBR, dataHoraBR, hojeISO, moeda, metros, metrosPorTipo } from '../lib/format'
import { useStore } from '../lib/store'
import { isPedidoCompleto, passoFeito, rotuloTipoDtf, type PassoFila, type Pedido } from '../lib/types'
import { EtiquetaEntrega, EtiquetaEstagio } from './StatusBadges'
import { Etiqueta, cn, useConfirmacao } from './ui'

/** Cartão de pedido usado nas listas */
export function PedidoCartao({
  pedido,
  acoes,
  extras,
  onPasso,
  mostrarVendedor = true,
  mostrarEntrega = true,
  mostrarValor = true,
}: {
  pedido: Pedido
  acoes?: ReactNode
  extras?: ReactNode
  /** quando vem, o selo de entrega do cartão fica clicável (marcar/desfazer) */
  onPasso?: (passo: PassoFila) => void
  mostrarVendedor?: boolean
  mostrarEntrega?: boolean
  /** usado nas telas de produção/entrega liberadas para quem não é o proprietário */
  mostrarValor?: boolean
}) {
  const { nomeVendedor } = useStore()
  const pronto = isPedidoCompleto(pedido)
  const ehUv = pedido.tipo_dtf === 'uv'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-hover sm:gap-4',
        pronto ? 'border-emerald-100' : 'border-slate-100',
      )}
    >
      <div className="min-w-0 flex-1 basis-[190px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-2 py-0.5 text-xs font-black text-white">
            #{pedido.numero}
          </span>
          <Etiqueta
            className={
              ehUv
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-pink-200 bg-pink-50 text-pink-700'
            }
          >
            {rotuloTipoDtf(pedido.tipo_dtf)}
          </Etiqueta>
          <span className="min-w-0 max-w-full break-words text-base font-extrabold text-slate-800">{pedido.cliente_nome}</span>
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
        <p className="mt-0.5 break-words text-xs text-slate-500">
          {pedido.descricao ? pedido.descricao : 'Sem descrição'} • {metrosPorTipo(pedido.metragem, pedido.tipo_dtf)}
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
        <EtiquetaEstagio status="concluido" />
        <EtiquetaEntrega entregue={pedido.entregue} onClick={onPasso ? () => onPasso('entregue') : undefined} />
      </div>

      {mostrarValor ? (
        <div className="w-[115px] text-right">
          <p className="text-base font-extrabold text-slate-800">{moeda(pedido.valor)}</p>
          <p className="text-[11px] text-slate-400">
            {dataBR(pedido.data_pedido || pedido.created_at)}
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

  /**
   * Clique num passo da fila (pago → imprimindo → concluída → entregue).
   * Passo já feito desfaz; passo novo marca.
   */
  const alternarPasso = async (p: Pedido, passo: PassoFila) => {
    const feito = passoFeito(p, passo)
    const agora = new Date().toISOString()
    const voltar = feito ? 'info' : undefined
    if (passo === 'pago') {
      await atualizarPedido(p.id, feito ? { pago: false, data_pagamento: null } : { pago: true, data_pagamento: p.data_pagamento || hojeISO() })
      avisar(feito ? `Fila #${p.numero} voltou para “a pagar”.` : `Pagamento da fila #${p.numero} confirmado!`, voltar)
    } else if (passo === 'concluida') {
      await atualizarPedido(
        p.id,
        feito ? { estagio: 'em_andamento' } : { estagio: 'concluido', iniciado_em: p.iniciado_em ?? agora },
      )
      avisar(feito ? `Fila #${p.numero} voltou para em andamento.` : `Fila #${p.numero} concluída!`, voltar)
    } else {
      await atualizarPedido(
        p.id,
        feito
          ? { entregue: false, data_entrega: null, data_envio: null, retirado_por: '', data_retirada: null }
          : { entregue: true, data_entrega: hojeISO(), data_envio: p.data_envio || hojeISO() },
      )
      avisar(feito ? `Fila #${p.numero} voltou para “não entregue”.` : `Fila #${p.numero} entregue ao cliente!`, voltar)
    }
  }

  /** fecha a fila: já saiu da máquina */
  const concluir = async (p: Pedido) => {
    await atualizarPedido(p.id, { estagio: 'concluido' })
    avisar(`Fila #${p.numero} concluída!`)
  }

  /** volta a fila para em andamento (quem clicou sem querer) */
  const reabrir = async (p: Pedido) => {
    await atualizarPedido(p.id, { estagio: 'em_andamento' })
    avisar(`Fila #${p.numero} voltou para em andamento.`, 'info')
  }

  /** o cliente já recebeu (marcação opcional, fora do relatório) */
  const marcarEntregue = async (p: Pedido) => {
    await atualizarPedido(p.id, {
      entregue: true,
      data_entrega: p.data_entrega || hojeISO(),
      data_envio: p.data_envio || hojeISO(),
    })
    avisar(`Fila #${p.numero} marcada como entregue!`)
  }

  const desmarcarEntregue = async (p: Pedido) => {
    await atualizarPedido(p.id, { entregue: false, data_entrega: null })
    avisar(`Fila #${p.numero} voltou para “não entregue”.`, 'info')
  }

  const marcarPago = async (p: Pedido) => {
    await atualizarPedido(p.id, { pago: true, data_pagamento: p.data_pagamento || hojeISO() })
    avisar(`Pagamento da fila #${p.numero} confirmado!`)
  }

  const marcarRetirado = async (p: Pedido, quem: string) => {
    if (!quem.trim()) {
      avisar('Informe quem retirou o pedido.', 'erro')
      return
    }
    await atualizarPedido(p.id, {
      retirado_por: quem.trim(),
      data_retirada: p.data_retirada || hojeISO(),
      entregue: true,
    })
    avisar(`Retirada da fila #${p.numero} registrada!`)
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
    alternarPasso,
    concluir,
    reabrir,
    marcarEntregue,
    desmarcarEntregue,
    marcarPago,
    marcarRetirado,
    atualizar,
    salvarRastreio,
    dialog,
  }
}

export const IconeVendedor = User
export const IconeEspecial = Star
export const IconeImpressora = Printer
