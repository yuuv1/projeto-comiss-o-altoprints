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

/**
 * A fila tem só dois estágios: está em andamento ou está concluída.
 * "Entregue" é uma marcação separada (opcional) e não entra no relatório.
 */
export const ESTAGIOS_FILA = ['em_andamento', 'concluido'] as const
export type EstagioFila = (typeof ESTAGIOS_FILA)[number]

export const LABEL_ESTAGIO: Record<EstagioFila, string> = {
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
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
  /** em andamento (na máquina/fila) ou concluído (já saiu) */
  estagio: EstagioFila
  /** quando a pessoa clicou em "deu início na impressão" (null = ainda não começou) */
  iniciado_em: string | null
  /** já foi entregue ao cliente? marcação opcional — não entra no relatório */
  entregue: boolean
  /** marcação opcional de pagamento (não é etapa da fila) */
  pago: boolean
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

/**
 * Faixa de metragem que define o preço do metro (valor automático da fila).
 * O proprietário muda os valores em Configurações → Preços.
 */
export interface FaixaPreco {
  id: string
  /** metragem inicial da faixa (inclusive) */
  de: number
  /** metragem final da faixa (o valor de `ate` já entra na faixa seguinte) — null = sem limite */
  ate: number | null
  /** preço do metro dentro da faixa */
  valor: number
  rotulo: string
}

export const FAIXAS_PRECO_PADRAO: FaixaPreco[] = [
  { id: 'preco-1', de: 1, ate: 5, valor: 59.9, rotulo: '1 a 5 m' },
  { id: 'preco-2', de: 5, ate: 20, valor: 54.9, rotulo: '5 a 20 m' },
  { id: 'preco-3', de: 20, ate: null, valor: 44.9, rotulo: '20 m ou mais' },
]

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

/** Telas extras (ficaram guardadas para usos futuros; hoje a equipe usa o sistema sem login) */
export interface TelasAcesso {
  /** Relatório de vendas — sempre filtrado pelos pedidos do próprio vendedor */
  relatorio: boolean
  /** Fila de impressão (sem valores em dinheiro) */
  paraImprimir: boolean
  /** Entregas: endereços, retiradas e código de rastreio (sem valores) */
  /** Relatório de cliente especial — só os clientes dele */
  clienteEspecial: boolean
}

export const TELAS_PADRAO: TelasAcesso = {
  relatorio: false,
  paraImprimir: false,
  clienteEspecial: false,
}

export const LABEL_TELA: Record<keyof TelasAcesso, string> = {
  relatorio: 'Relatório de vendas (só os dados dele)',
  paraImprimir: 'Para imprimir (fila de impressão, sem valores)',
  clienteEspecial: 'Cliente especial (só os clientes dele)',
}

export const DESCRICAO_TELA: Record<keyof TelasAcesso, string> = {
  relatorio: 'Vê a mesma tela de relatório, mas só com os pedidos, a metragem e a comissão dele.',
  paraImprimir: 'Ajuda na produção: vê a fila do que falta imprimir, sem valores em dinheiro.',
  clienteEspecial: 'Vê os clientes especiais dele (valor especial do metro), sem os dos outros.',
}

/** Telas liberadas para um acesso — o proprietário vê tudo, sempre */
export const telasDoUsuario = (u: Usuario | null | undefined): TelasAcesso => {
  if (!u || u.papel === 'proprietario')
    return { relatorio: true, paraImprimir: true, clienteEspecial: true }
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
  /**
   * `true` nos acessos de funcionário que entram **sem senha**: a pessoa toca no
   * próprio nome na tela de entrada. Vale só para vendedor — o proprietário
   * sempre usa senha. Quando o dono define uma senha para a conta
   * (Equipe → Vínculo e senha), isto volta a `false`.
   */
  sem_senha?: boolean
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
  /** preço do metro por faixa (valor automático da fila) */
  faixas_preco: FaixaPreco[]
  /**
   * `true` enquanto o banco estiver com os DADOS DE EXEMPLO (fictícios), que só
   * entram quando o proprietário pede em Configurações → Dados. Serve para o
   * sistema avisar na tela que aqueles pedidos não são reais — ninguém confunde
   * treino com produção. Volta a `false` ao apagar todos os dados.
   */
  modo_exemplo?: boolean
}

export const CONFIG_PADRAO: Configuracoes = {
  empresa_nome: 'Altoprints',
  logo_url: '',
  revisao_ultima_em: null,
  openai_key: '',
  faixas_comissao: FAIXAS_PADRAO,
  comissao_sem_metragem: 0,
  permissao_vendedor: 'sem_excluir',
  faixas_preco: FAIXAS_PRECO_PADRAO,
  modo_exemplo: false,
}

/**
 * Converte uma fila que veio de uma versão antiga (status_producao/pagamento)
 * para os campos de hoje. Também é usada ao restaurar um backup.
 */
export const normalizarPedido = (bruto: Partial<Pedido> & Record<string, unknown>): Pedido => {
  const p = { ...pedidoVazio(), ...bruto } as Pedido & {
    status_producao?: string
    status_pagamento?: string
    impresso?: boolean
  }
  if (!p.estagio) {
    const concluido =
      bruto.estagio === 'concluido' ||
      Boolean(bruto.impresso) ||
      bruto.status_producao === 'dtf_pronto' ||
      bruto.status_producao === 'imprimir'
    p.estagio = concluido ? 'concluido' : 'em_andamento'
  }
  if (p.iniciado_em === undefined || p.iniciado_em === null) {
    const antigo = bruto as { status_producao?: string; impresso_em?: string | null }
    const comecou =
      p.estagio === 'concluido' ||
      antigo.status_producao === 'imprimir' ||
      antigo.status_producao === 'dtf_pronto' ||
      Boolean(antigo.impresso_em)
    p.iniciado_em = comecou ? String(antigo.impresso_em || p.data_pedido || new Date().toISOString()) : null
  }
  if (p.entregue === undefined || p.entregue === null) {
    p.entregue = Boolean(p.data_entrega || p.data_retirada)
  }
  if (p.pago === undefined || p.pago === null) {
    p.pago = bruto.status_pagamento === 'pago' || Boolean(p.data_pagamento)
  }
  return p
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
  estagio: 'em_andamento',
  iniciado_em: null,
  entregue: false,
  pago: false,
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
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

/* ------------------------------------------------------------------ */
/* Estágios da fila                                                   */
/* ------------------------------------------------------------------ */

/** filas que ainda estão na máquina / por concluir */
export const naFilaDeImpressao = (p: Pedido) => p.estagio !== 'concluido'

/** fila concluída (já saiu da máquina) */
export const isPedidoCompleto = (p: Pedido) => p.estagio === 'concluido'

/**
 * Filas que entram na comissão e no relatório: as CONCLUÍDAS (que já saíram da
 * máquina). O que ainda está em andamento não é venda.
 *
 * A marcação de "pago" NÃO tira a fila da conta: ela é só orientação para a
 * equipe saber o que já foi recebido.
 */
export const filasDaComissao = (pedidos: Pedido[]) => pedidos.filter((p) => p.estagio === 'concluido')

/** fila ainda não marcada como paga (controle opcional do dono) */
export const pedidoPendenteFinanceiro = (p: Pedido) => !p.pago

/** Data usada no relatório: data do pagamento e, se não houver, a data do pedido. */
export const dataReferencia = (p: Pedido) => p.data_pagamento || (p.data_pedido || '').slice(0, 10)

/* ------------------------------------------------------------------ */
/* Passos da fila (os botões que a pessoa clica no cartão)             */
/* ------------------------------------------------------------------ */

/**
 * As três marcações do cartão: o pagamento (opcional), o fim da fila (o estágio
 * concluído) e a entrega ao cliente (opcional). Elas são clicáveis no cartão.
 */
export type PassoFila = 'pago' | 'concluida' | 'entregue'

export const PASSOS_FILA: { id: PassoFila; label: string; curto: string }[] = [
  { id: 'pago', label: 'Marcar como pago', curto: 'Pago' },
  { id: 'concluida', label: 'Concluir a fila (saiu da máquina)', curto: 'Concluída' },
  { id: 'entregue', label: 'Marcar como entregue ao cliente', curto: 'Entregue' },
]

/** o cartão mostra: a marcação já está feita? */
export const passoFeito = (p: Pedido, passo: PassoFila) =>
  passo === 'pago' ? p.pago : passo === 'concluida' ? p.estagio === 'concluido' : p.entregue

/* ------------------------------------------------------------------ */
/* Filtros da tela Pedidos                                             */
/* ------------------------------------------------------------------ */

export type FiltroFila = 'todas' | 'em_andamento' | 'a_pagar' | 'concluida' | 'entregue'

export const FILTROS_FILA: { id: FiltroFila; label: string; ajuda: string }[] = [
  { id: 'todas', label: 'Todas', ajuda: 'Todas as filas registradas.' },
  { id: 'em_andamento', label: 'Em andamento', ajuda: 'Filas que ainda estão na máquina.' },
  { id: 'a_pagar', label: 'A pagar', ajuda: 'Filas que ainda não foram marcadas como pagas.' },
  { id: 'concluida', label: 'Concluídas', ajuda: 'Filas que já saíram da máquina.' },
  { id: 'entregue', label: 'Entregues', ajuda: 'Filas que o cliente já recebeu.' },
]

export const combinaFiltro = (p: Pedido, filtro: FiltroFila) => {
  switch (filtro) {
    case 'em_andamento':
      return p.estagio !== 'concluido'
    case 'a_pagar':
      return !p.pago
    case 'concluida':
      return p.estagio === 'concluido'
    case 'entregue':
      return p.entregue
    default:
      return true
  }
}

/* ------------------------------------------------------------------ */
/* Ajuda de permissões                                                 */
/* ------------------------------------------------------------------ */

export const podeEditarPedidos = (permissao: PermissaoVendedor) => permissao !== 'somente_criar'
export const podeExcluirPedidos = (permissao: PermissaoVendedor) => permissao === 'total'
