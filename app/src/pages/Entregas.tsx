import { CheckCircle2, Inbox, MapPin, Package, Pencil, Store, Truck, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { Abas, Botao, Campo, CartaoResumo, Entrada, TituloPagina, Vazio } from '../components/ui'
import { dataBR, moeda } from '../lib/format'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import type { Pedido } from '../lib/types'

function CampoRetirada({ pedido, onSalvar }: { pedido: Pedido; onSalvar: (quem: string) => void }) {
  const [quem, setQuem] = useState(pedido.retirado_por)
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Campo label="Retirado por" className="w-44">
        <Entrada value={quem} onChange={(e) => setQuem(e.target.value)} placeholder="Nome de quem retirou" />
      </Campo>
      <Botao variante="sucesso" icone={CheckCircle2} onClick={() => onSalvar(quem)}>
        Registrar retirada
      </Botao>
    </div>
  )
}

export default function Entregas() {
  const { db } = useStore()
  const { ehProprietario } = useAuth()
  /** sem valores em dinheiro para quem não é o proprietário */
  const verValores = ehProprietario
  const acoes = useAcoesPedido()
  const [aba, setAba] = useState<'correios' | 'retirada'>('correios')
  const [rastreios, setRastreios] = useState<Record<string, string>>({})

  const correios = useMemo(
    () => db.pedidos.filter((p) => p.tipo_entrega === 'correios').sort((a, b) => b.numero - a.numero),
    [db.pedidos],
  )
  const retiradas = useMemo(
    () => db.pedidos.filter((p) => p.tipo_entrega === 'retirada').sort((a, b) => b.numero - a.numero),
    [db.pedidos],
  )

  const emTransito = correios.filter((p) => !p.data_entrega)
  const entregues = correios.filter((p) => p.data_entrega)
  const aguardando = retiradas.filter((p) => !p.data_retirada)
  const retirados = retiradas.filter((p) => p.data_retirada)

  return (
    <>
      <TituloPagina icone={Truck} titulo="Entregas" subtitulo="Acompanhe os envios pelos Correios e as retiradas na loja." />

      <Abas
        ativa={aba}
        onChange={setAba}
        abas={[
          { id: 'correios', label: 'Correios', icone: Truck, contador: emTransito.length },
          { id: 'retirada', label: 'Retirada na loja', icone: Store, contador: aguardando.length },
        ]}
      />

      {aba === 'correios' ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CartaoResumo titulo="Em trânsito" valor={emTransito.length} icone={Truck} gradiente="from-sky-500 to-blue-600" />
            <CartaoResumo titulo="Entregues" valor={entregues.length} icone={CheckCircle2} gradiente="from-emerald-500 to-green-600" />
            <CartaoResumo
              titulo="Sem rastreio"
              valor={correios.filter((p) => !p.codigo_rastreio).length}
              icone={Package}
              gradiente="from-amber-500 to-orange-600"
            />
            {verValores ? (
              <CartaoResumo
                titulo="Valor em trânsito"
                valor={moeda(emTransito.reduce((s, p) => s + Number(p.valor || 0), 0))}
                icone={MapPin}
                gradiente="from-violet-500 to-indigo-600"
              />
            ) : (
              <CartaoResumo
                titulo="Com rastreio"
                valor={correios.filter((p) => p.codigo_rastreio).length}
                icone={MapPin}
                gradiente="from-violet-500 to-indigo-600"
              />
            )}
          </div>

          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Em trânsito</p>
          {emTransito.length === 0 ? (
            <Vazio icone={Truck} titulo="Nenhum envio em trânsito" descricao="Os pedidos dos Correios aparecem aqui." />
          ) : (
            <div className="space-y-3">
              {emTransito.map((p) => (
                <PedidoCartao
                      mostrarValor={verValores}
                  key={p.id}
                  pedido={p}
                  extras={
                    <div className="flex flex-wrap items-end gap-2">
                      <Campo label="Código de rastreio" className="w-48">
                        <Entrada
                          value={rastreios[p.id] ?? p.codigo_rastreio}
                          onChange={(e) => setRastreios({ ...rastreios, [p.id]: e.target.value })}
                          placeholder="AA123456789BR"
                        />
                      </Campo>
                      <Botao
                        tamanho="sm"
                        variante="secundario"
                        onClick={() => acoes.salvarRastreio(p, rastreios[p.id] ?? p.codigo_rastreio)}
                      >
                        Salvar rastreio
                      </Botao>
                    </div>
                  }
                  acoes={
                    <>
                      <Botao tamanho="sm" variante="sucesso" icone={CheckCircle2} onClick={() => acoes.marcarEntregue(p)}>
                        Marcar como entregue
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

          <p className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-slate-400">Entregues</p>
          {entregues.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              Nenhuma entrega concluída ainda.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
              <div className="tabela-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Nº</th>
                      <th className="px-4 py-2.5">Cliente</th>
                      <th className="px-4 py-2.5">Cidade</th>
                      <th className="px-4 py-2.5">Rastreio</th>
                      <th className="px-4 py-2.5">Enviado</th>
                      <th className="px-4 py-2.5">Entregue</th>
                      <th className="px-4 py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entregues.map((p) => (
                      <tr key={p.id} className="text-slate-600 hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-extrabold text-slate-700">#{p.numero}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{p.cliente_nome}</td>
                        <td className="px-4 py-2.5">
                          {p.cidade ? `${p.cidade}/${p.estado}` : '—'}
                        </td>
                        <td className="px-4 py-2.5">{p.codigo_rastreio || '—'}</td>
                        <td className="px-4 py-2.5">{dataBR(p.data_envio)}</td>
                        <td className="px-4 py-2.5 font-semibold text-emerald-600">{dataBR(p.data_entrega)}</td>
                        {verValores ? <td className="px-4 py-2.5 text-right font-bold text-slate-700">{moeda(p.valor)}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CartaoResumo titulo="Aguardando retirada" valor={aguardando.length} icone={Inbox} gradiente="from-amber-500 to-orange-600" />
            <CartaoResumo titulo="Retirados" valor={retirados.length} icone={CheckCircle2} gradiente="from-emerald-500 to-green-600" />
            <CartaoResumo
              titulo="Prontos e pagos"
              valor={aguardando.filter((p) => p.status_producao === 'dtf_pronto' && p.status_pagamento === 'pago').length}
              icone={Package}
              gradiente="from-fuchsia-500 to-pink-600"
            />
            {verValores ? (
              <CartaoResumo
                titulo="Valor aguardando"
                valor={moeda(aguardando.reduce((s, p) => s + Number(p.valor || 0), 0))}
                icone={User}
                gradiente="from-sky-500 to-blue-600"
              />
            ) : (
              <CartaoResumo
                titulo="Retiradas hoje"
                valor={retirados.filter((p) => (p.data_retirada || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length}
                icone={Inbox}
                gradiente="from-amber-500 to-orange-600"
              />
            )}
          </div>

          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Aguardando retirada na loja</p>
          {aguardando.length === 0 ? (
            <Vazio icone={Store} titulo="Ninguém aguardando retirada" descricao="Os pedidos de retirada aparecem aqui." />
          ) : (
            <div className="space-y-3">
              {aguardando.map((p) => (
                <PedidoCartao
                      mostrarValor={verValores}
                  key={p.id}
                  pedido={p}
                  extras={<CampoRetirada pedido={p} onSalvar={(quem) => acoes.marcarRetirado(p, quem)} />}
                  acoes={
                    <>
                      <Botao tamanho="sm" variante="secundario" icone={Pencil} onClick={() => acoes.editar(p)}>
                        Editar
                      </Botao>
                    </>
                  }
                />
              ))}
            </div>
          )}

          <p className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-slate-400">Já retirados</p>
          {retirados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              Nenhuma retirada registrada ainda.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
              <div className="tabela-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Nº</th>
                      <th className="px-4 py-2.5">Cliente</th>
                      <th className="px-4 py-2.5">Retirado por</th>
                      <th className="px-4 py-2.5">Data</th>
                      <th className="px-4 py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {retirados.map((p) => (
                      <tr key={p.id} className="text-slate-600 hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-extrabold text-slate-700">#{p.numero}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{p.cliente_nome}</td>
                        <td className="px-4 py-2.5">{p.retirado_por || '—'}</td>
                        <td className="px-4 py-2.5 font-semibold text-emerald-600">{dataBR(p.data_retirada)}</td>
                        {verValores ? <td className="px-4 py-2.5 text-right font-bold text-slate-700">{moeda(p.valor)}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {acoes.dialog}
    </>
  )
}
