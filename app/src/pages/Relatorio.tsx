import {
  BarChart3,
  CalendarClock,
  Download,
  Eye,
  FileSpreadsheet,
  Percent,
  Printer,
  Receipt,
  RotateCcw,
  Ruler,
  Undo2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { LogoImpressao } from '../components/Logo'
import { Botao, Campo, Cartao, CartaoResumo, Entrada, Selecao, TituloPagina, Vazio, cn } from '../components/ui'
import { baixarCSV } from '../lib/csv'
import { dataBR, hojeISO, moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import type { Pedido, Vendedor } from '../lib/types'

type Campo = 'pagamento' | 'pedido' | 'envio'

const LABEL_CAMPO: Record<Campo, string> = {
  pagamento: 'Data do pagamento',
  pedido: 'Data do pedido',
  envio: 'Data do envio',
}

const dataRef = (p: Pedido, campo: Campo) => {
  if (campo === 'pedido') return (p.data_pedido || '').slice(0, 10)
  if (campo === 'envio') return p.data_envio || (p.data_pedido || '').slice(0, 10)
  return p.data_pagamento || (p.data_pedido || '').slice(0, 10)
}

const primeiroDiaDoMes = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function Relatorio() {
  const { db, nomeVendedor, avisar } = useStore()
  const [campo, setCampo] = useState<Campo>('pagamento')
  const [inicio, setInicio] = useState(primeiroDiaDoMes)
  const [fim, setFim] = useState(hojeISO)
  const [vendedorId, setVendedorId] = useState('todos')
  const [excluidos, setExcluidos] = useState<string[]>([])

  const atalhos = useMemo(() => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()
    return [
      { id: 'hoje', label: 'Hoje', de: hojeISO(), ate: hojeISO() },
      {
        id: 'semana',
        label: 'Esta semana',
        de: new Date(hoje.getTime() - ((hoje.getDay() + 6) % 7) * 86400000).toISOString().slice(0, 10),
        ate: hojeISO(),
      },
      {
        id: 'mes',
        label: 'Este mês',
        de: `${ano}-${String(mes + 1).padStart(2, '0')}-01`,
        ate: hojeISO(),
      },
      {
        id: 'mes-passado',
        label: 'Mês passado',
        de: new Date(ano, mes - 1, 1).toISOString().slice(0, 10),
        ate: new Date(ano, mes, 0).toISOString().slice(0, 10),
      },
    ]
  }, [])

  /** somente pedidos pagos */
  const pagos = useMemo(() => db.pedidos.filter((p) => p.status_pagamento === 'pago'), [db.pedidos])

  const filtrados = useMemo(() => {
    return pagos
      .filter((p) => {
        if (vendedorId === 'sem-vendedor') return !p.vendedor_id
        if (vendedorId !== 'todos') return p.vendedor_id === vendedorId
        return true
      })
      .filter((p) => {
        const d = dataRef(p, campo)
        if (!d) return false
        return d >= inicio && d <= fim
      })
      .sort((a, b) => dataRef(a, campo).localeCompare(dataRef(b, campo)) || a.numero - b.numero)
  }, [campo, fim, inicio, pagos, vendedorId])

  const visiveis = useMemo(() => filtrados.filter((p) => !excluidos.includes(p.id)), [excluidos, filtrados])

  const resumoVendedores = useMemo(() => {
    const mapa = new Map<string, { vendedor: Vendedor | undefined; pedidos: number; metragem: number; total: number }>()
    for (const p of visiveis) {
      const chave = p.vendedor_id || 'sem-vendedor'
      const item = mapa.get(chave) ?? {
        vendedor: db.vendedores.find((v) => v.id === p.vendedor_id),
        pedidos: 0,
        metragem: 0,
        total: 0,
      }
      item.pedidos += 1
      item.metragem += Number(p.metragem || 0)
      item.total += Number(p.valor || 0)
      mapa.set(chave, item)
    }
    return [...mapa.entries()]
      .map(([chave, v]) => ({ chave, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [db.vendedores, visiveis])

  const totais = useMemo(
    () => ({
      pedidos: visiveis.length,
      metragem: visiveis.reduce((s, p) => s + Number(p.metragem || 0), 0),
      faturamento: visiveis.reduce((s, p) => s + Number(p.valor || 0), 0),
      comissao: visiveis.reduce((s, p) => s + Number(p.valor || 0), 0) * 0.015,
    }),
    [visiveis],
  )

  const exportarCSV = () => {
    const linhas: (string | number)[][] = [
      ['Nº', 'Cliente', 'Vendedor', 'Observação', 'Metragem', 'Valor', 'Data do pagamento'],
      ...visiveis.map((p) => [
        p.numero,
        p.cliente_nome,
        nomeVendedor(p.vendedor_id),
        p.descricao || p.observacoes || '',
        numeroBR(p.metragem),
        numeroBR(p.valor),
        p.data_pagamento ? dataBR(p.data_pagamento) : '',
      ]),
      [],
      ['TOTAL', '', '', '', numeroBR(totais.metragem), numeroBR(totais.faturamento), ''],
      ['COMISSÃO 1,5%', '', '', '', '', numeroBR(totais.comissao), ''],
    ]
    baixarCSV(`relatorio-altoprints-${inicio}-a-${fim}`, linhas)
    avisar('CSV gerado! O arquivo abre no Excel com os acentos corretos.')
  }

  const periodoTexto = `${dataBR(inicio)} — ${dataBR(fim)}`

  return (
    <>
      {/* ------------------------------ tela ------------------------------ */}
      <div className="print:hidden">
        <TituloPagina
          icone={BarChart3}
          titulo="Relatório de vendas"
          subtitulo="Apenas pedidos pagos no período — pronto para a contabilidade."
          acoes={
            <>
              <Botao variante="secundario" icone={Printer} onClick={() => window.print()}>
                Imprimir / PDF
              </Botao>
              <Botao variante="secundario" icone={FileSpreadsheet} onClick={exportarCSV}>
                Exportar CSV
              </Botao>
            </>
          }
        />

        <Cartao className="mb-5" hover={false}>
          <div className="grid gap-3 lg:grid-cols-4">
            <Campo label="Filtrar por">
              <Selecao value={campo} onChange={(e) => setCampo(e.target.value as Campo)}>
                <option value="pagamento">Data do pagamento (recomendado)</option>
                <option value="pedido">Data do pedido</option>
                <option value="envio">Data do envio</option>
              </Selecao>
            </Campo>
            <Campo label="Início">
              <Entrada type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </Campo>
            <Campo label="Fim">
              <Entrada type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </Campo>
            <Campo label="Vendedor">
              <Selecao value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                <option value="todos">Todos os vendedores</option>
                {db.vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
                <option value="sem-vendedor">Sem vendedor</option>
              </Selecao>
            </Campo>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {atalhos.map((a) => (
              <Botao
                key={a.id}
                tamanho="sm"
                variante="secundario"
                onClick={() => {
                  setInicio(a.de)
                  setFim(a.ate)
                }}
                className={cn(inicio === a.de && fim === a.ate && 'border-purple-300 bg-purple-50 text-purple-700')}
              >
                {a.label}
              </Botao>
            ))}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <CalendarClock className="h-4 w-4 text-purple-600" />
              {LABEL_CAMPO[campo]}: {periodoTexto}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Para a contabilidade, use sempre <b>Data do pagamento</b>. Pedidos sem data de pagamento usam a data do
            pedido.
          </p>
        </Cartao>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CartaoResumo titulo="Pedidos pagos" valor={totais.pedidos} icone={Receipt} gradiente="from-pink-500 to-purple-600" />
          <CartaoResumo
            titulo="Metragem total"
            valor={`${numeroBR(totais.metragem)} m`}
            icone={Ruler}
            gradiente="from-sky-500 to-blue-600"
          />
          <CartaoResumo
            titulo="Faturamento"
            valor={moeda(totais.faturamento)}
            icone={FileSpreadsheet}
            gradiente="from-emerald-500 to-green-600"
          />
          <CartaoResumo
            titulo="Comissão (1,5%)"
            valor={moeda(totais.comissao)}
            icone={Percent}
            gradiente="from-amber-500 to-orange-600"
          />
        </div>

        {/* resumo por vendedor */}
        <Cartao className="mb-5" hover={false}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-800">Resumo por vendedor</h2>
            <span className="text-xs font-semibold text-slate-500">{resumoVendedores.length} vendedor(es)</span>
          </div>
          <div className="tabela-scroll overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Vendedor</th>
                  <th className="px-3 py-2.5 text-right">Pedidos</th>
                  <th className="px-3 py-2.5 text-right">Metragem</th>
                  <th className="px-3 py-2.5 text-right">Faturamento</th>
                  <th className="px-3 py-2.5 text-right">Comissão 1,5%</th>
                  <th className="px-3 py-2.5 text-right">Ticket médio</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumoVendedores.map((linha) => (
                  <tr key={linha.chave} className="text-slate-600 hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-bold text-slate-800">{linha.vendedor?.nome ?? 'Sem vendedor'}</td>
                    <td className="px-3 py-2.5 text-right">{linha.pedidos}</td>
                    <td className="px-3 py-2.5 text-right">{numeroBR(linha.metragem)} m</td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{moeda(linha.total)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{moeda(linha.total * 0.015)}</td>
                    <td className="px-3 py-2.5 text-right">{moeda(linha.total / (linha.pedidos || 1))}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Botao
                        tamanho="sm"
                        variante="secundario"
                        icone={Eye}
                        onClick={() => setVendedorId(linha.chave === 'sem-vendedor' ? 'sem-vendedor' : linha.chave)}
                      >
                        Ver só este
                      </Botao>
                    </td>
                  </tr>
                ))}
                {resumoVendedores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">
                      Nenhum pedido pago no período selecionado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
              {resumoVendedores.length ? (
                <tfoot>
                  <tr className="bg-slate-50 font-extrabold text-slate-800">
                    <td className="px-3 py-2.5">TOTAL</td>
                    <td className="px-3 py-2.5 text-right">{totais.pedidos}</td>
                    <td className="px-3 py-2.5 text-right">{numeroBR(totais.metragem)} m</td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">{moeda(totais.faturamento)}</td>
                    <td className="px-3 py-2.5 text-right text-amber-700">{moeda(totais.comissao)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {moeda(totais.faturamento / (totais.pedidos || 1))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </Cartao>

        {/* detalhamento */}
        <Cartao hover={false}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-800">Detalhamento dos pedidos</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{visiveis.length} pedidos</span>
              {excluidos.length ? (
                <Botao tamanho="sm" variante="secundario" icone={RotateCcw} onClick={() => setExcluidos([])}>
                  Restaurar todos ({excluidos.length})
                </Botao>
              ) : null}
            </div>
          </div>

          {excluidos.length ? (
            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              <Undo2 className="mr-1 inline h-3.5 w-3.5" />
              {excluidos.length} pedido(s) foram tirados apenas desta tela. Nada foi apagado do sistema.
            </p>
          ) : null}

          {visiveis.length === 0 ? (
            <Vazio
              icone={Receipt}
              titulo="Nenhum pedido pago no período"
              descricao="Ajuste o período ou o filtro de vendedor."
            />
          ) : (
            <div className="tabela-scroll overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="border border-slate-200 px-3 py-2">Nº</th>
                    <th className="border border-slate-200 px-3 py-2">Cliente</th>
                    <th className="border border-slate-200 px-3 py-2">Vendedor</th>
                    <th className="border border-slate-200 px-3 py-2">Observação</th>
                    <th className="border border-slate-200 px-3 py-2 text-right">Metragem</th>
                    <th className="border border-slate-200 px-3 py-2 text-right">Valor</th>
                    <th className="border border-slate-200 px-3 py-2">Pagamento</th>
                    <th className="border border-slate-200 px-3 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((p, i) => (
                    <tr key={p.id} className={cn(i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white', 'hover:bg-purple-50/40')}>
                      <td className="border border-slate-200 px-3 py-2 font-bold text-slate-700">#{p.numero}</td>
                      <td className="border border-slate-200 px-3 py-2">
                        <span className="font-semibold text-slate-700">{p.cliente_nome}</span>
                        {p.descricao ? <span className="block text-xs text-slate-400">{p.descricao}</span> : null}
                      </td>
                      <td className="border border-slate-200 px-3 py-2">{nomeVendedor(p.vendedor_id)}</td>
                      <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">
                        {p.observacoes || '—'}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                        {p.metragem ? `${numeroBR(p.metragem)} m` : '—'}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-right font-bold tabular-nums text-emerald-600">
                        {moeda(p.valor)}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 whitespace-nowrap">{dataBR(p.data_pagamento)}</td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        <button
                          title="Tirar do relatório (não apaga o pedido)"
                          onClick={() => setExcluidos((e) => [...e, p.id])}
                          className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-extrabold text-slate-800">
                    <td className="border border-slate-200 px-3 py-2" colSpan={4}>
                      TOTAL GERAL
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                      {numeroBR(totais.metragem)} m
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-emerald-700">
                      {moeda(totais.faturamento)}
                    </td>
                    <td className="border border-slate-200 px-3 py-2" colSpan={2}>
                      Comissão 1,5%: {moeda(totais.comissao)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Cartao>
      </div>

      {/* --------------------- versão impressa (A4) ---------------------- */}
      <div className="print-area">
        <div className="mb-4 flex items-center gap-3 border-b-2 border-black pb-3">
          <LogoImpressao />
          <div className="ml-auto text-right text-[13px] leading-tight">
            <p className="text-lg font-black uppercase">{db.configuracoes.empresa_nome || 'Altoprints'}</p>
            <p className="font-bold">Relatório de vendas pagas</p>
            <p>Período ({LABEL_CAMPO[campo].toLowerCase()}): {periodoTexto}</p>
            <p>Emitido em {dataBR(new Date().toISOString())}</p>
          </div>
        </div>

        <div className="sem-quebra mb-4">
          <p className="mb-1 font-bold">Resumo por vendedor</p>
          <table className="tabela-print">
            <thead>
              <tr>
                <th>Vendedor</th>
                <th className="num">Pedidos</th>
                <th className="num">Metragem</th>
                <th className="num">Faturamento</th>
                <th className="num">Comissão 1,5%</th>
              </tr>
            </thead>
            <tbody>
              {resumoVendedores.map((l) => (
                <tr key={l.chave}>
                  <td>{l.vendedor?.nome ?? 'Sem vendedor'}</td>
                  <td className="num">{l.pedidos}</td>
                  <td className="num">{numeroBR(l.metragem)} m</td>
                  <td className="num">{moeda(l.total)}</td>
                  <td className="num">{moeda(l.total * 0.015)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mb-1 font-bold">Detalhamento dos pedidos</p>
        <table className="tabela-print">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Observação</th>
              <th className="num">Metragem</th>
              <th className="num">Valor</th>
              <th>Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((p) => (
              <tr key={p.id}>
                <td>#{p.numero}</td>
                <td>
                  {p.cliente_nome}
                  {p.descricao ? <div style={{ fontSize: '11px' }}>{p.descricao}</div> : null}
                </td>
                <td>{nomeVendedor(p.vendedor_id)}</td>
                <td>{p.observacoes || '—'}</td>
                <td className="num">{p.metragem ? `${numeroBR(p.metragem)} m` : '—'}</td>
                <td className="num">{moeda(p.valor)}</td>
                <td>{dataBR(p.data_pagamento)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>TOTAL GERAL</td>
              <td className="num">{numeroBR(totais.metragem)} m</td>
              <td className="num">{moeda(totais.faturamento)}</td>
              <td className="num">Comissão: {moeda(totais.comissao)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-3 text-[11px]">
          Documento gerado pelo sistema {db.configuracoes.empresa_nome || 'Altoprints'} em{' '}
          {dataBR(new Date().toISOString())}.
        </p>
      </div>
    </>
  )
}
