import { AlertTriangle, BellRing, CalendarClock, Pencil, Trash2, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { diasEntre, dataHoraBR, moeda, metros } from '../lib/format'
import { useStore } from '../lib/store'
import { isPedidoCompleto, type Pedido } from '../lib/types'
import { EtiquetaEstagio } from './StatusBadges'
import { Botao, Modal, cn, useConfirmacao } from './ui'

const DIAS_REVISAO = 3

/** Janela de revisão que reaparece a cada 3 dias com os pedidos incompletos */
export function ReviewModal() {
  const { db, carregando, atualizarPedido, excluirPedido, salvarConfig, nomeVendedor } = useStore()
  const [fechadoNestaSessao, setFechado] = useState(false)
  const [mantidos, setMantidos] = useState<string[]>([])
  const { confirmar, dialog } = useConfirmacao()
  const navegar = useNavigate()

  const pendentes = useMemo(
    () =>
      db.pedidos
        .filter((p) => !isPedidoCompleto(p) && !mantidos.includes(p.id))
        .sort((a, b) => a.data_pedido.localeCompare(b.data_pedido)),
    [db.pedidos, mantidos],
  )

  const vencida = useMemo(() => {
    const ultima = db.configuracoes.revisao_ultima_em
    if (!ultima) return true
    const d = new Date(ultima)
    if (Number.isNaN(d.getTime())) return true
    return diasEntre(new Date(), d) >= DIAS_REVISAO
  }, [db.configuracoes.revisao_ultima_em])

  const aberto = !carregando && !fechadoNestaSessao && vencida && pendentes.length > 0

  const fechar = async () => {
    setFechado(true)
    await salvarConfig({ revisao_ultima_em: new Date().toISOString() })
  }

  const manter = (p: Pedido) => setMantidos((m) => [...m, p.id])

  const excluir = async (p: Pedido) => {
    const ok = await confirmar({
      titulo: `Excluir o pedido #${p.numero}?`,
      mensagem: (
        <>
          O pedido de <b>{p.cliente_nome}</b> será apagado junto com os arquivos de arte. Esta ação não pode ser
          desfeita.
        </>
      ),
    })
    if (ok) await excluirPedido(p.id)
  }

  const marcarPago = async (p: Pedido) => {
    await atualizarPedido(p.id, {
      pago: true,
      data_pagamento: p.data_pagamento || new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <>
      <Modal
        aberto={aberto}
        onFechar={fechar}
        largura="max-w-3xl"
        icone={BellRing}
        titulo="Revisão de pedidos pendentes"
        subtitulo={`Estes pedidos ainda não estão como DTF pronto e Pago. Edite agora se já foi resolvido, mantenha na lista (volta a avisar em ${DIAS_REVISAO} dias) ou exclua.`}
        rodape={
          <>
            <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <CalendarClock className="h-4 w-4" />
              Última revisão:{' '}
              {db.configuracoes.revisao_ultima_em ? dataHoraBR(db.configuracoes.revisao_ultima_em) : 'nunca'}
            </span>
            <Botao variante="secundario" onClick={fechar}>
              Fechar
            </Botao>
          </>
        }
      >
        {pendentes.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Tudo em ordem! Nenhum pedido pendente para revisar. 🎉
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendentes.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
              >
                <div className="min-w-[140px] flex-1">
                  <p className="text-sm font-extrabold text-slate-800">
                    #{p.numero} <span className="font-bold text-slate-600">{p.cliente_nome}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.descricao ? `${p.descricao} • ` : 'Sem descrição • '}
                    {metros(p.metragem)} • {nomeVendedor(p.vendedor_id)}
                  </p>
                  <p className="text-[11px] text-slate-400">{dataHoraBR(p.data_pedido)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <EtiquetaEstagio status={p.estagio} />
                </div>

                <p className="w-24 text-right text-sm font-extrabold text-slate-800">{moeda(p.valor)}</p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Botao
                    tamanho="sm"
                    variante="secundario"
                    icone={Pencil}
                    onClick={() => {
                      setFechado(true)
                      navegar(`/pedido/${p.id}`)
                    }}
                  >
                    Editar
                  </Botao>
                  <Botao tamanho="sm" variante="sucesso" icone={AlertTriangle} onClick={() => marcarPago(p)}>
                    Pago
                  </Botao>
                  <Botao tamanho="sm" variante="aviso" onClick={() => manter(p)}>
                    Manter
                  </Botao>
                  <Botao tamanho="sm" variante="perigo" icone={Trash2} onClick={() => excluir(p)}>
                    Excluir
                  </Botao>
                </div>
              </div>
            ))}
          </div>
        )}
        {mantidos.length > 0 ? (
          <button
            onClick={() => setMantidos([])}
            className={cn(
              'mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:underline',
            )}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Trazer de volta os {mantidos.length} pedido(s) que eu mantive
          </button>
        ) : null}
      </Modal>
      {dialog}
    </>
  )
}
