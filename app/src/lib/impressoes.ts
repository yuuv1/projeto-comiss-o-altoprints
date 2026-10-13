// Regras das impressões da produção: totais, períodos, filtros e resumos.
// Tudo o que a tela "Impressões", o histórico do pedido e o "Meu dia" usam.
import { dataHoraBR, numeroBR, parseData } from './format'
import type { Impressao } from './types'

export type PeriodoImpressoes = 'hoje' | 'semana' | 'mes' | 'tudo'

export const LABEL_PERIODO: Record<PeriodoImpressoes, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
  tudo: 'Tudo',
}

/** Início do período pedido (null = sem limite) */
export const inicioDoPeriodo = (periodo: PeriodoImpressoes, agora = new Date()): Date | null => {
  if (periodo === 'tudo') return null
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  if (periodo === 'hoje') return hoje
  if (periodo === 'semana') return new Date(hoje.getTime() - 6 * 86400000)
  return new Date(agora.getFullYear(), agora.getMonth(), 1)
}

export const noPeriodo = (i: Impressao, periodo: PeriodoImpressoes, agora = new Date()) => {
  const inicio = inicioDoPeriodo(periodo, agora)
  if (!inicio) return true
  const d = parseData(i.quando)
  return Boolean(d && d.getTime() >= inicio.getTime())
}

export interface ResumoImpressoes {
  total: number
  metros: number
  reimpressoes: number
  /** metros refeitos em reimpressão (o que se perdeu) */
  metrosPerdidos: number
  /** % de reimpressão (reimpressões ÷ total de impressões) */
  percentualReimpressao: number
}

export const resumirImpressoes = (lista: Impressao[]): ResumoImpressoes => {
  const reimpressoes = lista.filter((i) => i.tipo === 'reimpressao')
  const metros = lista.reduce((s, i) => s + (Number(i.metros) || 0), 0)
  const metrosPerdidos = reimpressoes.reduce((s, i) => s + (Number(i.metros) || 0), 0)
  return {
    total: lista.length,
    metros,
    reimpressoes: reimpressoes.length,
    metrosPerdidos,
    percentualReimpressao: lista.length ? (reimpressoes.length / lista.length) * 100 : 0,
  }
}

/** Impressões de um dia (o padrão é hoje) */
export const doDia = (lista: Impressao[], dia = new Date()) =>
  lista.filter((i) => {
    const d = parseData(i.quando)
    return d ? d.toDateString() === dia.toDateString() : false
  })

/** Impressões de um pedido, da mais recente para a mais antiga */
export const doPedido = (lista: Impressao[], pedidoId: string) =>
  lista
    .filter((i) => i.pedido_id === pedidoId)
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)))

/** Resumo do pedido em uma linha: "2× · 4,50 m no total · por RAISSA em 08/10, 14:32" */
export const resumoDoPedido = (lista: Impressao[], pedidoId: string) => {
  const dele = doPedido(lista, pedidoId)
  if (!dele.length) return ''
  const total = dele.reduce((s, i) => s + (Number(i.metros) || 0), 0)
  const ultima = dele[0]
  return `${dele.length}× · ${numeroBR(total)} m no total · por ${ultima.quem || '—'} em ${dataHoraBR(ultima.quando)}`
}

/** Nomes de quem já imprimiu (para o filtro da tela) */
export const quemImprimiu = (lista: Impressao[]) =>
  [...new Set(lista.map((i) => (i.quem || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))

export interface FiltrosImpressoes {
  periodo: PeriodoImpressoes
  /** nome de quem imprimiu; vazio = todos */
  quem: string
  /** texto livre: pedido, cliente, arte, motivo ou observação */
  busca: string
  soReimpressoes: boolean
}

export const filtrarImpressoes = (lista: Impressao[], f: FiltrosImpressoes, agora = new Date()) => {
  const termo = f.busca.trim().toLowerCase()
  return lista
    .filter((i) => noPeriodo(i, f.periodo, agora))
    .filter((i) => !f.quem || (i.quem || '') === f.quem)
    .filter((i) => !f.soReimpressoes || i.tipo === 'reimpressao')
    .filter((i) => {
      if (!termo) return true
      const alvo = [
        `#${i.pedido_numero}`,
        String(i.pedido_numero),
        i.cliente_nome,
        i.arquivo_nome,
        i.motivo,
        i.observacao,
        i.quem,
      ]
        .join(' ')
        .toLowerCase()
      return alvo.includes(termo)
    })
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)))
}

/** Linhas do CSV/Excel da tela de impressões */
export const linhasCSVImpressoes = (
  lista: Impressao[],
  /** opcional: devolve o nome do vendedor a partir do id do pedido (visão do dono) */
  vendedorDoPedido?: (pedidoId: string) => string,
): (string | number)[][] => [
  [
    'Data/hora',
    'Pedido',
    'Cliente',
    ...(vendedorDoPedido ? ['Vendedor'] : []),
    'Arte',
    'Metros',
    'Quem imprimiu',
    'Tipo',
    'Motivo',
    'Observação',
  ],
  ...lista.map((i) => [
    dataHoraBR(i.quando),
    `#${i.pedido_numero}`,
    i.cliente_nome,
    ...(vendedorDoPedido ? [vendedorDoPedido(i.pedido_id)] : []),
    i.arquivo_nome,
    numeroBR(i.metros),
    i.quem,
    i.tipo === 'reimpressao' ? 'Reimpressão' : 'Impressão',
    i.motivo,
    i.observacao,
  ]),
]
