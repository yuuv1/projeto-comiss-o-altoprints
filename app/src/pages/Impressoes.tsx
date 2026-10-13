import {
  CalendarDays,
  FileSpreadsheet,
  History,
  Printer,
  PrinterCheck,
  RotateCcw,
  Ruler,
  Search,
  Trash2,
  TrendingDown,
  User,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegistrarImpressao } from '../components/impressao'
import { LogoImpressao } from '../components/Logo'
import {
  Abas,
  BarraAcoes,
  Botao,
  Campo,
  CartaoResumo,
  Etiqueta,
  Selecao,
  TituloPagina,
  Vazio,
  cn,
  useConfirmacao,
} from '../components/ui'
import { useAuth } from '../lib/auth'
import { baixarCSV } from '../lib/csv'
import { dataBR, dataHoraBR, hojeISO, numeroBR } from '../lib/format'
import {
  filtrarImpressoes,
  LABEL_PERIODO,
  linhasCSVImpressoes,
  quemImprimiu,
  resumirImpressoes,
  type PeriodoImpressoes,
} from '../lib/impressoes'
import { useStore } from '../lib/store'
import { type Impressao, LABEL_TIPO_IMPRESSAO } from '../lib/types'

export default function Impressoes({ embutido = false }: { embutido?: boolean } = {}) {
  const { db, excluirImpressao, avisar, nomeVendedor } = useStore()
  const { ehProprietario } = useAuth()
  const { confirmar, dialog } = useConfirmacao()
  const impressao = useRegistrarImpressao()

  const [periodo, setPeriodo] = useState<PeriodoImpressoes>('hoje')
  const [quem, setQuem] = useState('todos')
  const [vendedor, setVendedor] = useState('todos')
  const [busca, setBusca] = useState('')
  const [soReimpressoes, setSoReimpressoes] = useState(false)

  const nomes = useMemo(() => quemImprimiu(db.impressoes), [db.impressoes])

  /** de qual vendedor é cada pedido — é o que permite olhar as filas por vendedor */
  const vendedorDoPedido = useMemo(() => new Map(db.pedidos.map((p) => [p.id, p.vendedor_id])), [db.pedidos])

  const filtradas = useMemo(() => {
    const base = filtrarImpressoes(db.impressoes, {
      periodo,
      quem: quem === 'todos' ? '' : quem,
      busca,
      soReimpressoes,
    })
    if (vendedor === 'todos') return base
    return base.filter((i) => (vendedorDoPedido.get(i.pedido_id) ?? '') === vendedor)
  }, [busca, db.impressoes, periodo, quem, soReimpressoes, vendedor, vendedorDoPedido])

  const resumo = resumirImpressoes(filtradas)

  const exportarCSV = () => {
    baixarCSV(
      `impressoes-altoprints-${hojeISO()}`,
      linhasCSVImpressoes(
        filtradas,
        ehProprietario ? (pedidoId) => nomeVendedor(vendedorDoPedido.get(pedidoId)) : undefined,
      ),
    )
    avisar('CSV gerado! O arquivo abre no Excel com os acentos corretos.')
  }

  const pedirExclusao = async (i: Impressao) => {
    const ok = await confirmar({
      titulo: `Excluir esta impressão do pedido #${i.pedido_numero}?`,
      mensagem: (
        <>
          O registro de <b>{numeroBR(i.metros)} m</b> impressos em {dataHoraBR(i.quando)} por <b>{i.quem || '—'}</b>{' '}
          será apagado. Se era a única impressão do pedido, ele volta para a fila de impressão.
        </>
      ),
    })
    if (ok) await excluirImpressao(i.id)
  }

  return (
    <>
      {embutido ? (
        <BarraAcoes>
          <Botao icone={PrinterCheck} onClick={() => impressao.novo()}>
            Registrar impressão
          </Botao>
          <Botao variante="secundario" icone={Printer} onClick={() => window.print()} disabled={!filtradas.length}>
            Imprimir / PDF
          </Botao>
          <Botao variante="secundario" icone={FileSpreadsheet} onClick={exportarCSV} disabled={!filtradas.length}>
            Exportar CSV
          </Botao>
        </BarraAcoes>
      ) : (
        <TituloPagina
          icone={History}
          titulo="Impressões"
          subtitulo="Tudo o que saiu da máquina: metros, quem imprimiu, reimpressões e o motivo."
          acoes={
            <>
              <Botao icone={PrinterCheck} onClick={() => impressao.novo()}>
                Registrar impressão
              </Botao>
              <Botao variante="secundario" icone={Printer} onClick={() => window.print()} disabled={!filtradas.length}>
                Imprimir / PDF
              </Botao>
              <Botao variante="secundario" icone={FileSpreadsheet} onClick={exportarCSV} disabled={!filtradas.length}>
                Exportar CSV
              </Botao>
            </>
          }
        />
      )}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo
          titulo="Impressões"
          valor={resumo.total}
          icone={Printer}
          gradiente="from-fuchsia-500 to-pink-600"
        />
        <CartaoResumo
          titulo="Metros impressos"
          valor={`${numeroBR(resumo.metros)} m`}
          icone={Ruler}
          gradiente="from-sky-500 to-blue-600"
        />
        <CartaoResumo
          titulo="Metros em reimpressão"
          valor={`${numeroBR(resumo.metrosPerdidos)} m`}
          icone={TrendingDown}
          gradiente="from-amber-500 to-orange-600"
        />
        <CartaoResumo
          titulo="% de reimpressão"
          valor={`${numeroBR(resumo.percentualReimpressao, 1)}%`}
          sub={`${resumo.reimpressoes} reimpressão(ões)`}
          icone={RotateCcw}
          gradiente="from-violet-500 to-indigo-600"
        />
      </div>

      <div className="print:hidden">
        <div className="mb-2">
          <Abas
            ativa={periodo}
            onChange={setPeriodo}
            abas={(Object.keys(LABEL_PERIODO) as PeriodoImpressoes[]).map((p) => ({
              id: p,
              label: LABEL_PERIODO[p],
            }))}
          />
        </div>

        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por pedido, cliente, arte, motivo ou observação..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <Campo label="Quem imprimiu">
            <Selecao value={quem} onChange={(e) => setQuem(e.target.value)}>
              <option value="todos">Todos</option>
              {nomes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Selecao>
          </Campo>
          {ehProprietario ? (
            <Campo label="Vendedor" dica="As filas dos pedidos de cada vendedor.">
              <Selecao value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
                <option value="todos">Todos os vendedores</option>
                {db.vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          ) : null}
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <input
              type="checkbox"
              checked={soReimpressoes}
              onChange={(e) => setSoReimpressoes(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-600"
            />
            Só reimpressões
          </label>
        </div>

        {filtradas.length === 0 ? (
          <Vazio
            icone={History}
            titulo="Nenhuma impressão neste filtro"
            descricao={
              db.impressoes.length
                ? 'Tente mudar o período (por exemplo, “Tudo”) ou limpar a busca.'
                : 'Clique em “Registrar impressão” para catalogar o que saiu da máquina — ou marque um pedido na tela “Para imprimir”.'
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="tabela-scroll overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    <th className="px-4 py-3">Quando</th>
                    <th className="px-4 py-3">Pedido</th>
                    {ehProprietario ? <th className="px-4 py-3">Vendedor</th> : null}
                    <th className="px-4 py-3">Arte</th>
                    <th className="px-4 py-3">Metros</th>
                    <th className="px-4 py-3">Quem imprimiu</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Observação</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((i) => (
                    <tr
                      key={i.id}
                      className={cn(
                        'border-b border-slate-50 align-top last:border-0 dark:border-slate-800/60',
                        i.tipo === 'reimpressao' ? 'bg-amber-50/60 dark:bg-amber-950/20' : '',
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {dataHoraBR(i.quando)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/pedido/${i.pedido_id}`}
                          className="font-extrabold text-slate-700 hover:text-purple-700 dark:text-slate-200 dark:hover:text-purple-300"
                        >
                          #{i.pedido_numero}
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{i.cliente_nome}</div>
                      </td>
                      {ehProprietario ? (
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {nomeVendedor(vendedorDoPedido.get(i.pedido_id))}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {i.arquivo_nome || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                        {numeroBR(i.metros)} m
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <User className="h-3.5 w-3.5" />
                          {i.quem || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {i.tipo === 'reimpressao' ? (
                          <Etiqueta className="border-amber-200 bg-amber-50 text-amber-800" icone={RotateCcw}>
                            {i.motivo || LABEL_TIPO_IMPRESSAO.reimpressao}
                          </Etiqueta>
                        ) : (
                          <Etiqueta className="border-emerald-200 bg-emerald-50 text-emerald-700" icone={Printer}>
                            {LABEL_TIPO_IMPRESSAO.impressao}
                          </Etiqueta>
                        )}
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {i.observacao || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {ehProprietario ? (
                          <Botao
                            tamanho="icone"
                            variante="ghost"
                            title="Excluir este registro"
                            onClick={() => pedirExclusao(i)}
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Botao>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --------------------- versão impressa (A4) ---------------------- */}
      <div className="print-area">
        <div className="mb-4 flex items-center gap-3 border-b-2 border-black pb-3">
          <LogoImpressao />
          <div className="ml-auto text-right text-[13px] leading-tight">
            <p className="text-lg font-black uppercase">{db.configuracoes.empresa_nome || 'Altoprints'}</p>
            <p className="font-bold">Folha de produção — impressões</p>
            <p>Período: {LABEL_PERIODO[periodo]}</p>
            <p>Emitido em {dataBR(new Date().toISOString())}</p>
          </div>
        </div>

        <div className="sem-quebra mb-4">
          <p className="mb-1 font-bold">
            Resumo: {resumo.total} impressão(ões) · {numeroBR(resumo.metros)} m impressos ·{' '}
            {numeroBR(resumo.metrosPerdidos)} m em reimpressão ({numeroBR(resumo.percentualReimpressao, 1)}%)
          </p>
        </div>

        <table className="tabela-print">
          <thead>
            <tr>
              <th>Data/hora</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Arte</th>
              <th className="num">Metros</th>
              <th>Quem imprimiu</th>
              <th>Tipo</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((i) => (
              <tr key={i.id}>
                <td>{dataHoraBR(i.quando)}</td>
                <td>#{i.pedido_numero}</td>
                <td>{i.cliente_nome}</td>
                <td>{i.arquivo_nome || '—'}</td>
                <td className="num">{numeroBR(i.metros)} m</td>
                <td>{i.quem || '—'}</td>
                <td>{i.tipo === 'reimpressao' ? `Reimpressão — ${i.motivo || 'sem motivo'}` : 'Impressão'}</td>
                <td>{i.observacao || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px]">
          Documento gerado pelo sistema {db.configuracoes.empresa_nome || 'Altoprints'} em{' '}
          {dataBR(new Date().toISOString())}.
        </p>
      </div>

      {dialog}
      {impressao.janela}
    </>
  )
}
