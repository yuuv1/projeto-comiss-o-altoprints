import { CalendarClock, Mail, Percent, Phone, Printer, Ruler, Star, User, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LogoImpressao } from '../components/Logo'
import { BarraAcoes, Botao, Campo, Cartao, CartaoResumo, Entrada, Selecao, TituloPagina, Vazio } from '../components/ui'
import { dataBR, hojeISO, moeda, numeroBR } from '../lib/format'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { LABEL_ESTAGIO, type Pedido } from '../lib/types'

const primeiroDiaDoMes = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** Extrato do cliente especial — também aparece como aba dentro de Clientes */
export default function RelatorioClienteEspecial({ embutido = false }: { embutido?: boolean } = {}) {
  const { db, nomeVendedor } = useStore()
  const { usuario, ehProprietario } = useAuth()
  // vendedor com a tela liberada vê só os clientes especiais dele
  const especiais = useMemo(
    () =>
      db.clientes.filter(
        (c) => c.especial && (ehProprietario || c.vendedor_id === (usuario?.vendedor_id ?? '')),
      ),
    [db.clientes, ehProprietario, usuario?.vendedor_id],
  )
  const [clienteId, setClienteId] = useState('')
  const [inicio, setInicio] = useState(primeiroDiaDoMes)
  const [fim, setFim] = useState(hojeISO)

  const cliente = useMemo(
    () => especiais.find((c) => c.id === clienteId) ?? especiais[0],
    [clienteId, especiais],
  )

  const pedidos = useMemo(() => {
    if (!cliente) return []
    return db.pedidos
      .filter(
        (p) =>
          p.cliente_id === cliente.id ||
          p.cliente_nome.trim().toLowerCase() === cliente.nome.trim().toLowerCase(),
      )
      .filter((p) => {
        const d = p.data_pagamento || (p.data_pedido || '').slice(0, 10)
        return d >= inicio && d <= fim
      })
      .sort((a, b) => a.numero - b.numero)
  }, [cliente, db.pedidos, fim, inicio])

  const pagos = pedidos.filter((p) => p.pago)
  const pendentes = pedidos.filter((p) => !p.pago)

  const somar = (lista: Pedido[]) => ({
    metragem: lista.reduce((s, p) => s + Number(p.metragem || 0), 0),
    valor: lista.reduce((s, p) => s + Number(p.valor || 0), 0),
  })
  const totalPagos = somar(pagos)
  const totalPendentes = somar(pendentes)

  if (!especiais.length) {
    return (
      <>
        {embutido ? null : (
          <TituloPagina
            icone={Star}
            titulo="Relatório cliente especial"
            subtitulo="Escolha um cliente marcado como ★ especial."
          />
        )}
        <Vazio
          icone={Star}
          titulo="Nenhum cliente especial cadastrado"
          descricao="Marque um cliente como ★ Cliente especial na tela de Clientes para gerar este relatório."
        />
      </>
    )
  }

  const tabela = (titulo: string, lista: Pedido[], totais: { metragem: number; valor: number }) => (
    <Cartao hover={false} className="mb-4">
      <h2 className="mb-3 text-base font-extrabold text-slate-800">{titulo}</h2>
      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          Nenhum pedido nesta situação no período.
        </p>
      ) : (
        <div className="tabela-scroll overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="border border-slate-200 px-3 py-2">Nº</th>
                <th className="border border-slate-200 px-3 py-2">Data</th>
                <th className="border border-slate-200 px-3 py-2">Descrição</th>
                <th className="border border-slate-200 px-3 py-2">Produção</th>
                <th className="border border-slate-200 px-3 py-2">Pagamento</th>
                <th className="border border-slate-200 px-3 py-2 text-right">Metragem</th>
                <th className="border border-slate-200 px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => (
                <tr key={p.id} className={i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="border border-slate-200 px-3 py-2 font-bold text-slate-700">#{p.numero}</td>
                  <td className="border border-slate-200 px-3 py-2 whitespace-nowrap">{dataBR(p.data_pedido)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">
                    {p.descricao || 'Sem descrição'}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-xs">
                    {p.estagio === 'concluido' ? 'Impresso' : p.iniciado_em ? 'Imprimindo' : 'A imprimir'}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-xs">{p.pago ? 'Pago' : 'A pagar'}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                    {p.metragem ? `${numeroBR(p.metragem)} m` : '—'}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-bold tabular-nums text-emerald-600">
                    {moeda(p.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-800">
                <td className="border border-slate-200 px-3 py-2" colSpan={5}>
                  TOTAL
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                  {numeroBR(totais.metragem)} m
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-emerald-700">
                  {moeda(totais.valor)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Cartao>
  )

  return (
    <>
      <div className="print:hidden">
        {embutido ? (
          <BarraAcoes>
            <Botao variante="secundario" icone={Printer} onClick={() => window.print()}>
              Imprimir / PDF
            </Botao>
          </BarraAcoes>
        ) : (
          <TituloPagina
            icone={Star}
            titulo="Relatório cliente especial"
            subtitulo="Extrato do cliente com pedidos pagos e pendentes — pronto para enviar."
            acoes={
              <Botao variante="secundario" icone={Printer} onClick={() => window.print()}>
                Imprimir / PDF
              </Botao>
            }
          />
        )}

        <Cartao className="mb-3" hover={false}>
          <div className="grid gap-3 lg:grid-cols-4">
            <Campo label="Cliente especial" className="lg:col-span-2">
              <Selecao value={cliente?.id ?? ''} onChange={(e) => setClienteId(e.target.value)}>
                {especiais.map((c) => (
                  <option key={c.id} value={c.id}>
                    ★ {c.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo label="Início">
              <Entrada type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </Campo>
            <Campo label="Fim">
              <Entrada type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </Campo>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { label: 'Este mês', de: primeiroDiaDoMes(), ate: hojeISO() },
              {
                label: 'Últimos 90 dias',
                de: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
                ate: hojeISO(),
              },
              { label: 'Este ano', de: `${new Date().getFullYear()}-01-01`, ate: hojeISO() },
            ].map((a) => (
              <Botao
                key={a.label}
                tamanho="sm"
                variante="secundario"
                onClick={() => {
                  setInicio(a.de)
                  setFim(a.ate)
                }}
              >
                {a.label}
              </Botao>
            ))}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <CalendarClock className="h-4 w-4 text-purple-600" />
              Período: {dataBR(inicio)} — {dataBR(fim)}
            </span>
          </div>
        </Cartao>

        {cliente ? (
          <Cartao className="mb-3" hover={false}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-black text-white">
                {cliente.nome.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-[200px]">
                <p className="flex items-center gap-2 text-xl font-extrabold text-slate-800">
                  {cliente.nome} <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </p>
                <p className="flex flex-wrap items-center gap-x-4 text-sm text-slate-500">
                  {cliente.telefone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {cliente.telefone}
                    </span>
                  ) : null}
                  {cliente.email ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> {cliente.email}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {nomeVendedor(cliente.vendedor_id)}
                  </span>
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Valor especial do metro</p>
                <p className="text-xl font-black text-purple-600">
                  {cliente.valor_especial_metro ? `${moeda(cliente.valor_especial_metro)}/m` : 'tabela normal'}
                </p>
              </div>
            </div>
          </Cartao>
        ) : null}

        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CartaoResumo titulo="Pedidos pagos" valor={pagos.length} icone={Wallet} gradiente="from-emerald-500 to-green-600" />
          <CartaoResumo titulo="Total pago" valor={moeda(totalPagos.valor)} icone={Percent} gradiente="from-pink-500 to-purple-600" />
          <CartaoResumo
            titulo="Pendentes"
            valor={pendentes.length}
            icone={CalendarClock}
            gradiente="from-amber-500 to-orange-600"
          />
          <CartaoResumo
            titulo="Metragem paga"
            valor={`${numeroBR(totalPagos.metragem)} m`}
            icone={Ruler}
            gradiente="from-sky-500 to-blue-600"
          />
        </div>

        {tabela('Pedidos pagos', pagos, totalPagos)}
        {tabela('Pedidos pendentes / parciais', pendentes, totalPendentes)}
      </div>

      {/* --------------------- versão impressa (A4) ---------------------- */}
      <div className="print-area">
        <div className="mb-4 flex items-start gap-3 border-b-2 border-black pb-3">
          <LogoImpressao />
          <div className="ml-auto text-right text-[13px] leading-tight">
            <p className="text-lg font-black uppercase">{db.configuracoes.empresa_nome || 'Altoprints'}</p>
            <p className="font-bold">Extrato do cliente</p>
            <p>
              Período: {dataBR(inicio)} — {dataBR(fim)}
            </p>
            <p>Emitido em {dataBR(new Date().toISOString())}</p>
          </div>
        </div>

        {cliente ? (
          <>
            <table className="tabela-print mb-4">
              <tbody>
                <tr>
                  <th style={{ width: '22%' }}>Cliente</th>
                  <td>{cliente.nome}</td>
                  <th style={{ width: '18%' }}>Telefone</th>
                  <td>{cliente.telefone || '—'}</td>
                </tr>
                <tr>
                  <th>E-mail</th>
                  <td>{cliente.email || '—'}</td>
                  <th>Vendedor</th>
                  <td>{nomeVendedor(cliente.vendedor_id)}</td>
                </tr>
                <tr>
                  <th>Valor especial do metro</th>
                  <td colSpan={3}>
                    {cliente.valor_especial_metro ? `${moeda(cliente.valor_especial_metro)}/m` : 'valor da tabela'}
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="mb-1 font-bold">Pedidos pagos</p>
            <table className="tabela-print mb-4">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th className="num">Metragem</th>
                  <th className="num">Valor</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.numero}</td>
                    <td>{dataBR(p.data_pedido)}</td>
                    <td>{p.descricao || 'Sem descrição'}</td>
                    <td className="num">{p.metragem ? `${numeroBR(p.metragem)} m` : '—'}</td>
                    <td className="num">{moeda(p.valor)}</td>
                    <td>{dataBR(p.data_pagamento)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>TOTAL PAGO</td>
                  <td className="num">{numeroBR(totalPagos.metragem)} m</td>
                  <td className="num">{moeda(totalPagos.valor)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>

            <p className="mb-1 font-bold">Pedidos pendentes</p>
            <table className="tabela-print">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Produção</th>
                  <th className="num">Metragem</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pendentes.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.numero}</td>
                    <td>{dataBR(p.data_pedido)}</td>
                    <td>{p.descricao || 'Sem descrição'}</td>
                    <td>{LABEL_ESTAGIO[p.estagio]}</td>
                    <td className="num">{p.metragem ? `${numeroBR(p.metragem)} m` : '—'}</td>
                    <td className="num">{moeda(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>TOTAL PENDENTE</td>
                  <td className="num">{numeroBR(totalPendentes.metragem)} m</td>
                  <td className="num">{moeda(totalPendentes.valor)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        ) : null}
      </div>
    </>
  )
}
