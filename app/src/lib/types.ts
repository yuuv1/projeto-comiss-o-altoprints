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

/* ------------------------------------------------------------------ */
/* Impressões (produção)                                               */
/* ------------------------------------------------------------------ */

export type TipoImpressao = 'impressao' | 'reimpressao'

export const LABEL_TIPO_IMPRESSAO: Record<TipoImpressao, string> = {
  impressao: 'Impressão',
  reimpressao: 'Reimpressão',
}

/** Sugestões de motivo de reimpressão (o campo aceita outro texto) */
export const MOTIVOS_REIMPRESSAO = [
  'Arte errada',
  'Defeito na impressão',
  'Tamanho errado',
  'Cor errada',
  'Ajuste pedido pelo cliente',
  'Outro',
] as const

/**
 * Uma impressão registrada na produção: o que realmente saiu da máquina.
 * É o histórico que diz quantos metros foram impressos, por quem, e quanto
 * se perdeu em reimpressão.
 */
export interface Impressao {
  id: ID
  pedido_id: ID
  /** número do pedido na época (fica no histórico mesmo se o pedido mudar) */
  pedido_numero: number
  cliente_nome: string
  /** arte usada, quando o pedido tem arquivos enviados */
  arquivo_id: ID | ''
  arquivo_nome: string
  /** metros que saíram da máquina nesta impressão */
  metros: number
  /** quem imprimiu (já vem com o nome do acesso, pode ser trocado) */
  quem: string
  usuario_id: ID | ''
  tipo: TipoImpressao
  /** motivo, quando for reimpressão */
  motivo: string
  observacao: string
  quando: string // ISO
  created_at: string
}

/** Campos preenchidos na janela de registrar impressão */
export interface DadosImpressao {
  metros: number
  quem: string
  usuario_id?: ID | ''
  arquivo_id?: ID | ''
  arquivo_nome?: string
  tipo: TipoImpressao
  motivo?: string
  observacao?: string
  /** usado nos dados de exemplo e ao importar histórico */
  quando?: string
}

/** Faixa de metragem que define o percentual de comissão do pedido */
export interface FaixaComissao {
  id: string
  /** metragem inicial da faixa (inclusive) */
  de: number
  /**
   * metragem final da faixa (a última metragem fica para a faixa seguinte,
   * ex.: "1 a 5" pega de 1 até 4,99 m) — null = sem limite
   */
  ate: number | null
  /** percentual de comissão sobre o faturamento do pedido */
  percentual: number
  rotulo: string
}

/**
 * Faixas de comissão definidas pelo proprietário.
 * Cada faixa vale de `de` até antes de `ate` (o valor de `ate` já entra na
 * faixa seguinte) — só podem ser mudadas por ele, em Configurações.
 */
export const FAIXAS_PADRAO: FaixaComissao[] = [
  { id: 'faixa-1', de: 1, ate: 5, percentual: 4, rotulo: '1 a 5 m' },
  { id: 'faixa-2', de: 5, ate: 10, percentual: 3.5, rotulo: '5 a 10 m' },
  { id: 'faixa-3', de: 10, ate: 20, percentual: 3, rotulo: '10 a 20 m' },
  { id: 'faixa-4', de: 20, ate: 50, percentual: 2.5, rotulo: '20 a 50 m' },
  { id: 'faixa-5', de: 50, ate: 100, percentual: 2, rotulo: '50 a 100 m' },
  { id: 'faixa-6', de: 100, ate: null, percentual: 1.5, rotulo: 'acima de 100 m' },
]

/* ------------------------------------------------------------------ */
/* Contas de acesso                                                    */
/* ------------------------------------------------------------------ */

export type Papel = 'proprietario' | 'vendedor'

export const LABEL_PAPEL: Record<Papel, string> = {
  proprietario: 'Proprietário',
  vendedor: 'Vendedor',
}

/** Telas extras que o proprietário pode liberar para um acesso de vendedor */
export interface TelasAcesso {
  /** Relatório de vendas — sempre filtrado pelos pedidos do próprio vendedor */
  relatorio: boolean
  /** Fila de impressão (sem valores em dinheiro) */
  paraImprimir: boolean
  /** Registro das impressões (produção: metros, quem imprimiu, reimpressões) */
  impressoes: boolean
  /** Entregas: endereços, retiradas e código de rastreio (sem valores) */
  entregas: boolean
  /** Relatório de cliente especial — só os clientes dele */
  clienteEspecial: boolean
}

export const TELAS_PADRAO: TelasAcesso = {
  relatorio: false,
  paraImprimir: false,
  impressoes: false,
  entregas: false,
  clienteEspecial: false,
}

export const LABEL_TELA: Record<keyof TelasAcesso, string> = {
  relatorio: 'Relatório de vendas (só os dados dele)',
  paraImprimir: 'Para imprimir (fila de impressão, sem valores)',
  impressoes: 'Impressões (o que saiu da máquina, sem valores)',
  entregas: 'Entregas (endereços, retiradas e rastreio, sem valores)',
  clienteEspecial: 'Cliente especial (só os clientes dele)',
}

export const DESCRICAO_TELA: Record<keyof TelasAcesso, string> = {
  relatorio: 'Vê a mesma tela de relatório, mas só com os pedidos, a metragem e a comissão dele.',
  paraImprimir: 'Ajuda na produção: vê a fila do que falta imprimir, sem valores em dinheiro.',
  impressoes: 'Acompanha a produção: o que foi impresso, os metros e as reimpressões — sem valores.',
  entregas: 'Vê os endereços e códigos de rastreio para ajudar na entrega, sem valores.',
  clienteEspecial: 'Vê os clientes especiais dele (valor especial do metro), sem os dos outros.',
}

/** Telas liberadas para um acesso — o proprietário vê tudo, sempre */
export const telasDoUsuario = (u: Usuario | null | undefined): TelasAcesso => {
  if (!u || u.papel === 'proprietario')
    return { relatorio: true, paraImprimir: true, impressoes: true, entregas: true, clienteEspecial: true }
  return { ...TELAS_PADRAO, ...(u.telas ?? {}) }
}

export const podeVerTela = (u: Usuario | null | undefined, tela: keyof TelasAcesso) =>
  telasDoUsuario(u)[tela]

export interface Usuario {
  id: ID
  nome: string
  /** nome de usuário do login (sem espaços, minúsculo) */
  usuario: string
  /** senha criptografada (SHA-256 + sal) — nunca guardamos a senha em texto puro */
  senha_hash: string
  papel: Papel
  /** vendedor vinculado (usado para saber quais pedidos são "dele") */
  vendedor_id: ID | ''
  ativo: boolean
  /** id da conta na nuvem (Supabase Auth), quando usarmos o login do Supabase */
  auth_id?: string
  /** telas de relatório liberadas pelo proprietário (vendedores) */
  telas?: Partial<TelasAcesso>
  criado_em: string
}

/** O que o vendedor pode fazer com os próprios pedidos (definido pelo proprietário) */
export type PermissaoVendedor = 'total' | 'sem_excluir' | 'somente_criar'

export const LABEL_PERMISSAO: Record<PermissaoVendedor, string> = {
  total: 'Pode criar, editar e excluir os próprios pedidos',
  sem_excluir: 'Pode criar e editar, mas não excluir',
  somente_criar: 'Pode apenas criar (ajustes ficam com o proprietário)',
}

export const DESCRICAO_PERMISSAO: Record<PermissaoVendedor, string> = {
  total: 'Total autonomia — excluir sempre pede confirmação.',
  sem_excluir: 'Evita perda de histórico: ninguém exclui pedido pelo celular.',
  somente_criar: 'O vendedor lança o pedido e o escritório ajusta valor e status.',
}

export interface Configuracoes {
  empresa_nome: string
  logo_url: string
  revisao_ultima_em: string | null
  openai_key: string
  /** faixas de metragem x percentual de comissão */
  faixas_comissao: FaixaComissao[]
  /** percentual aplicado em pedidos sem metragem informada (padrão: 0) */
  comissao_sem_metragem: number
  /** o que o vendedor pode fazer com os próprios pedidos */
  permissao_vendedor: PermissaoVendedor
}

export const CONFIG_PADRAO: Configuracoes = {
  empresa_nome: 'Altoprints',
  logo_url: '',
  revisao_ultima_em: null,
  openai_key: '',
  faixas_comissao: FAIXAS_PADRAO,
  comissao_sem_metragem: 0,
  permissao_vendedor: 'sem_excluir',
}

/** Resumo de uma faixa de comissão (usado nos relatórios) */
export interface FaixaResumo {
  id: string
  rotulo: string
  percentual: number
  pedidos: number
  metragem: number
  faturamento: number
  comissao: number
}

export interface DB {
  vendedores: Vendedor[]
  clientes: Cliente[]
  pedidos: Pedido[]
  arquivos: Arquivo[]
  impressoes: Impressao[]
  usuarios: Usuario[]
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

/* ------------------------------------------------------------------ */
/* Ajuda de permissões                                                 */
/* ------------------------------------------------------------------ */

export const podeEditarPedidos = (permissao: PermissaoVendedor) => permissao !== 'somente_criar'
export const podeExcluirPedidos = (permissao: PermissaoVendedor) => permissao === 'total'
