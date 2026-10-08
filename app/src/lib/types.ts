// Tipos e constantes do domínio (Altoprints — gestão de pedidos DTF)

export type ID = string

export interface Vendedor {
  id: ID
  nome: string
  created_at: string
}

export interface Cliente {
  id: ID
  nome: string
  telefone: string
  email: string
  observacoes: string
  vendedor_id: ID | ''
  valor_especial_metro: number | null
  especial: boolean
  created_at: string
}

export const STATUS_PRODUCAO = [
  'editar_arte',
  'fila_impressao',
  'pagamento',
  'imprimir',
  'dtf_pronto',
] as const
export type StatusProducao = (typeof STATUS_PRODUCAO)[number]

export const LABEL_PRODUCAO: Record<StatusProducao, string> = {
  editar_arte: 'Editar arte',
  fila_impressao: 'Fila de impressão',
  pagamento: 'Pagamento',
  imprimir: 'Imprimir',
  dtf_pronto: 'DTF pronto',
}

export const STATUS_PAGAMENTO = ['pendente', 'pago', 'parcial', 'cancelado'] as const
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number]

export const LABEL_PAGAMENTO: Record<StatusPagamento, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
}

export const FORMAS_PAGAMENTO = [
  'Pix',
  'Dinheiro',
  'Cartão de crédito',
  'Cartão de débito',
  'Transferência',
  'Boleto',
  'Outro',
] as const

export type TipoEntrega = 'retirada' | 'correios'
export const LABEL_ENTREGA: Record<TipoEntrega, string> = {
  retirada: 'Retirada',
  correios: 'Correios',
}

export const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const

export type ValorModo = 'auto' | 'manual'

export interface Pedido {
  id: ID
  numero: number
  cliente_nome: string
  cliente_id: ID | null
  vendedor_id: ID | ''
  descricao: string
  metragem: number | null
  valor: number
  valor_modo: ValorModo
  status_producao: StatusProducao
  status_pagamento: StatusPagamento
  forma_pagamento: string
  data_pagamento: string | null // YYYY-MM-DD
  data_pedido: string // ISO
  observacoes: string
  tipo_entrega: TipoEntrega
  endereco: string
  cidade: string
  estado: string
  cep: string
  codigo_rastreio: string
  data_envio: string | null
  data_entrega: string | null
  retirado_por: string
  data_retirada: string | null
  impresso: boolean
  impresso_em: string | null
  aviso_visto: boolean
  created_at: string
  updated_at: string
}

export interface Arquivo {
  id: ID
  pedido_id: ID
  nome: string
  tipo: string
  tamanho: number
  /** no modo nuvem guarda a URL pública; no modo local o blob fica no IndexedDB */
  url: string
  created_at: string
}

export interface Configuracoes {
  empresa_nome: string
  logo_url: string
  revisao_ultima_em: string | null
  openai_key: string
}

export const CONFIG_PADRAO: Configuracoes = {
  empresa_nome: 'Altoprints',
  logo_url: '',
  revisao_ultima_em: null,
  openai_key: '',
}

export interface DB {
  vendedores: Vendedor[]
  clientes: Cliente[]
  pedidos: Pedido[]
  arquivos: Arquivo[]
  configuracoes: Configuracoes
}

export const pedidoVazio = (): Omit<Pedido, 'id'> => ({
  numero: 0,
  cliente_nome: '',
  cliente_id: null,
  vendedor_id: '',
  descricao: '',
  metragem: null,
  valor: 0,
  valor_modo: 'auto',
  status_producao: 'editar_arte',
  status_pagamento: 'pendente',
  forma_pagamento: '',
  data_pagamento: null,
  data_pedido: new Date().toISOString(),
  observacoes: '',
  tipo_entrega: 'retirada',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  codigo_rastreio: '',
  data_envio: null,
  data_entrega: null,
  retirado_por: '',
  data_retirada: null,
  impresso: false,
  impresso_em: null,
  aviso_visto: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export const isPedidoCompleto = (p: Pedido) =>
  p.status_producao === 'dtf_pronto' && p.status_pagamento === 'pago'

export const pedidoPendenteFinanceiro = (p: Pedido) =>
  p.status_pagamento === 'pendente' || p.status_pagamento === 'parcial'

/** Data usada no relatório: data do pagamento e, se não houver, a data do pedido. */
export const dataReferencia = (p: Pedido) => p.data_pagamento || (p.data_pedido || '').slice(0, 10)
