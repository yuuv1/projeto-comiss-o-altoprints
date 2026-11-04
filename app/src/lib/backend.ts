// Camada de persistência. O site publicado usa só o Supabase central; armazenamento local fica restrito a dev/testes.
import { gravarBancoBruto, lerBancoBruto } from './armazenamento'
import { migrarFaixas } from './comissao'
import { clienteNuvem, clienteNuvemObrigatorio } from './supabase'
import {
  CONFIG_PADRAO,
  type Arquivo,
  type Cliente,
  type Configuracoes,
  type DB,
  type ID,
  type Impressao,
  type Pedido,
  type Usuario,
  type Vendedor,
} from './types'
import { normalizarPedido } from './types'

export type Tabela = 'vendedores' | 'clientes' | 'pedidos' | 'arquivos' | 'impressoes' | 'usuarios'
export type Registro = Vendedor | Cliente | Pedido | Arquivo | Impressao | Usuario

/** todas as tabelas de dados (usado ao limpar/substituir o banco) */
const TABELAS: Tabela[] = ['vendedores', 'clientes', 'pedidos', 'arquivos', 'impressoes', 'usuarios']
const TABELAS_LIMPAR: Tabela[] = ['impressoes', 'arquivos', 'pedidos', 'clientes', 'vendedores', 'usuarios']

/** Colunas aceitas em cada tabela do Supabase (evita que chaves extras de backups antigos quebrem o PostgREST) */
const COLUNAS_TABELA: Record<Tabela, readonly string[]> = {
  vendedores: ['id', 'nome', 'created_at'],
  clientes: [
    'id',
    'nome',
    'telefone',
    'email',
    'observacoes',
    'vendedor_id',
    'valor_especial_metro',
    'especial',
    'created_at',
  ],
  pedidos: [
    'id',
    'numero',
    'cliente_nome',
    'cliente_id',
    'vendedor_id',
    'descricao',
    'tipo_dtf',
    'metragem',
    'valor',
    'valor_modo',
    'estagio',
    'iniciado_em',
    'entregue',
    'pago',
    'status_producao',
    'status_pagamento',
    'forma_pagamento',
    'data_pagamento',
    'data_pedido',
    'observacoes',
    'tipo_entrega',
    'endereco',
    'cidade',
    'estado',
    'cep',
    'codigo_rastreio',
    'data_envio',
    'data_entrega',
    'retirado_por',
    'data_retirada',
    'impresso',
    'impresso_em',
    'aviso_visto',
    'created_at',
    'updated_at',
  ],
  arquivos: ['id', 'pedido_id', 'nome', 'tipo', 'tamanho', 'url', 'created_at'],
  impressoes: [
    'id',
    'pedido_id',
    'pedido_numero',
    'cliente_nome',
    'arquivo_id',
    'arquivo_nome',
    'metros',
    'quem',
    'usuario_id',
    'tipo',
    'motivo',
    'observacao',
    'quando',
    'created_at',
  ],
  usuarios: [
    'id',
    'nome',
    'usuario',
    'senha_hash',
    'sem_senha',
    'papel',
    'vendedor_id',
    'ativo',
    'telas',
    'criado_em',
    'auth_id',
  ],
}

const limparParaTabela = (tabela: Tabela, registro: Registro): Record<string, unknown> => {
  const origem = registro as unknown as Record<string, unknown>
  const limpo: Record<string, unknown> = {}
  for (const coluna of COLUNAS_TABELA[tabela]) {
    if (origem[coluna] !== undefined) limpo[coluna] = origem[coluna]
  }
  return limpo
}

/**
 * Ajusta a configuração para o padrão atual: quem nunca editou as faixas recebe a
 * tabela de comissão nova, e o "sem metragem" antigo (3%) passa a ser 0% como
 * combinado com o proprietário.
 */
const comConfigAtual = (c: Configuracoes): Configuracoes => {
  const faixas = migrarFaixas(c.faixas_comissao)
  const migrou = faixas !== c.faixas_comissao
  return {
    ...c,
    faixas_comissao: faixas,
    comissao_sem_metragem: migrou && Number(c.comissao_sem_metragem) === 3 ? 0 : c.comissao_sem_metragem,
  }
}

const dbVazio = (): DB => ({
  vendedores: [],
  clientes: [],
  pedidos: [],
  arquivos: [],
  impressoes: [],
  usuarios: [],
  configuracoes: { ...CONFIG_PADRAO },
})

/* ------------------------------------------------------------------ */
/* Armazenamento de desenvolvimento/testes (nunca usado pelo site)     */
/* ------------------------------------------------------------------ */

const lerLocal = async (): Promise<DB> => {
  try {
    const bruto = await lerBancoBruto()
    if (!bruto) return dbVazio()
    const parsed = JSON.parse(bruto) as Partial<DB>
    return {
      vendedores: parsed.vendedores ?? [],
      clientes: parsed.clientes ?? [],
      // pedidos gravados por versões antigas ganham o modelo novo (estágio, entrega, pago)
      pedidos: ((parsed.pedidos ?? []) as Partial<Pedido>[]).map(normalizarPedido),
      arquivos: parsed.arquivos ?? [],
      impressoes: parsed.impressoes ?? [],
      usuarios: parsed.usuarios ?? [],
      configuracoes: comConfigAtual({ ...CONFIG_PADRAO, ...(parsed.configuracoes ?? {}) }),
    }
  } catch {
    return dbVazio()
  }
}

const gravarLocal = async (db: DB) => {
  await gravarBancoBruto(JSON.stringify(db))
}

/* ------------------------------------------------------------------ */
/* Erro amigável                                                       */
/* ------------------------------------------------------------------ */

const tratarErro = (contexto: string, erro: { message?: string } | null): never => {
  const msg = erro?.message || 'erro desconhecido'
  if (/does not exist|schema cache|relation/i.test(msg))
    throw new Error(
      `${contexto}: as tabelas ainda não foram criadas no Supabase. Rode o arquivo supabase/schema.sql no SQL Editor do seu projeto.`,
    )
  // o projeto grátis do Supabase é pausado depois de uma semana sem uso
  if (/failed to fetch|fetch failed|networkerror|load failed|err_/i.test(msg))
    throw new Error(
      `${contexto}: não foi possível falar com o banco na nuvem. Confira a internet e se o projeto do Supabase não está pausado (no plano grátis ele pausa depois de uma semana sem uso: abra o painel do Supabase e clique em Restore project).`,
    )
  if (/invalid api key|jwt|unauthorized|401/i.test(msg))
    throw new Error(
      `${contexto}: a chave do Supabase parece inválida. Confira VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env (use a chave publishable/anon, nunca a secret).`,
    )
  throw new Error(`${contexto}: ${msg}`)
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

/** true quando a nuvem está conectada (usado pelas telas) */
export const modoNuvem = () => Boolean(clienteNuvem())

const TAMANHO_PAGINA_SUPABASE = 1000

async function selecionarTodos<T>(
  sb: NonNullable<ReturnType<typeof clienteNuvemObrigatorio>>,
  tabela: Tabela,
  colunaOrdem: string,
  ascending: boolean,
): Promise<{ data: T[]; error: { message?: string } | null }> {
  const acumulado: T[] = []
  let inicio = 0
  while (true) {
    const consulta = sb.from(tabela).select('*').order(colunaOrdem, { ascending })
    const res =
      typeof consulta.range === 'function'
        ? await consulta.range(inicio, inicio + TAMANHO_PAGINA_SUPABASE - 1)
        : await consulta
    if (res.error) return { data: [], error: res.error }
    const lote = (res.data ?? []) as T[]
    acumulado.push(...lote)
    if (lote.length < TAMANHO_PAGINA_SUPABASE || typeof consulta.range !== 'function') break
    inicio += TAMANHO_PAGINA_SUPABASE
  }
  return { data: acumulado, error: null }
}

export async function carregarTudo(): Promise<DB> {
  const sb = clienteNuvemObrigatorio()
  if (!sb) return await lerLocal()

  const [vendedores, clientes, pedidos, arquivos, impressoes, usuarios, config] = await Promise.all([
    selecionarTodos<Vendedor>(sb, 'vendedores', 'nome', true),
    selecionarTodos<Cliente>(sb, 'clientes', 'nome', true),
    selecionarTodos<Pedido>(sb, 'pedidos', 'numero', false),
    selecionarTodos<Arquivo>(sb, 'arquivos', 'created_at', false),
    selecionarTodos<Impressao>(sb, 'impressoes', 'quando', false),
    selecionarTodos<Usuario>(sb, 'usuarios', 'nome', true),
    sb.from('configuracoes').select('*').eq('id', 1).maybeSingle(),
  ])

  for (const res of [vendedores, clientes, pedidos, arquivos, impressoes, usuarios, config]) {
    if (res.error) tratarErro('Não foi possível carregar os dados', res.error)
  }

  const cfg = (config.data?.valor ?? {}) as Partial<Configuracoes>

  return {
    vendedores: (vendedores.data ?? []) as Vendedor[],
    clientes: (clientes.data ?? []) as Cliente[],
    pedidos: ((pedidos.data ?? []) as Partial<Pedido>[]).map(normalizarPedido),
    arquivos: (arquivos.data ?? []) as Arquivo[],
    impressoes: (impressoes.data ?? []) as Impressao[],
    usuarios: (usuarios.data ?? []) as Usuario[],
    configuracoes: comConfigAtual({ ...CONFIG_PADRAO, ...cfg }),
  }
}

export async function salvarRegistro(tabela: Tabela, registro: Registro): Promise<void> {
  const sb = clienteNuvemObrigatorio()
  if (!sb) {
    const db = await lerLocal()
    const lista = db[tabela] as Registro[]
    const i = lista.findIndex((r) => r.id === registro.id)
    if (i >= 0) lista[i] = registro
    else lista.push(registro)
    await gravarLocal(db)
    return
  }
  const { error } = await sb.from(tabela).upsert(limparParaTabela(tabela, registro) as never)
  if (error) tratarErro('Não foi possível salvar', error)
}

export async function salvarVarios(tabela: Tabela, registros: Registro[]): Promise<void> {
  if (!registros.length) return
  const sb = clienteNuvemObrigatorio()
  if (!sb) {
    const db = await lerLocal()
    const lista = db[tabela] as Registro[]
    for (const registro of registros) {
      const i = lista.findIndex((r) => r.id === registro.id)
      if (i >= 0) lista[i] = registro
      else lista.push(registro)
    }
    await gravarLocal(db)
    return
  }
  const limpos = registros.map((r) => limparParaTabela(tabela, r))
  for (let i = 0; i < limpos.length; i += 500) {
    const lote = limpos.slice(i, i + 500)
    const { error } = await sb.from(tabela).upsert(lote as never)
    if (error) tratarErro('Não foi possível salvar', error)
  }
}

export async function removerRegistro(tabela: Tabela, id: ID): Promise<void> {
  const sb = clienteNuvemObrigatorio()
  if (!sb) {
    const db = await lerLocal()
    db[tabela] = (db[tabela] as Registro[]).filter((r) => r.id !== id) as never
    await gravarLocal(db)
    return
  }
  const { error } = await sb.from(tabela).delete().eq('id', id)
  if (error) tratarErro('Não foi possível excluir', error)
}

export async function removerArquivosDoPedido(pedidoId: ID): Promise<void> {
  const sb = clienteNuvemObrigatorio()
  if (!sb) {
    const db = await lerLocal()
    db.arquivos = db.arquivos.filter((a) => a.pedido_id !== pedidoId)
    await gravarLocal(db)
    return
  }
  const { error } = await sb.from('arquivos').delete().eq('pedido_id', pedidoId)
  if (error) tratarErro('Não foi possível excluir os arquivos', error)
}

export async function salvarConfiguracoes(parcial: Partial<Configuracoes>): Promise<void> {
  const sb = clienteNuvemObrigatorio()
  if (!sb) {
    const db = await lerLocal()
    db.configuracoes = { ...db.configuracoes, ...parcial }
    await gravarLocal(db)
    return
  }
  const atual = (await sb.from('configuracoes').select('*').eq('id', 1).maybeSingle()).data
  const valor = { ...((atual?.valor ?? {}) as Partial<Configuracoes>), ...parcial }
  const { error } = await sb.from('configuracoes').upsert({ id: 1, valor })
  if (error) tratarErro('Não foi possível salvar as configurações', error)
}

/** Apaga tudo (usado pelo botão de limpar dados / recarregar demonstração / restaurar backup) */
export async function substituirTudo(db: DB): Promise<void> {
  const sb = clienteNuvemObrigatorio()
  if (!sb) {
    await gravarLocal(db)
    return
  }
  for (const t of TABELAS_LIMPAR) {
    const { error } = await sb.from(t).delete().not('id', 'is', null)
    if (error) tratarErro('Não foi possível limpar os dados', error)
  }
  for (const t of TABELAS) {
    const linhas = (db[t] as Registro[]).map((r) => limparParaTabela(t, r))
    if (!linhas.length) continue
    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500)
      const { error } = await sb.from(t).upsert(lote as never)
      if (error) tratarErro('Não foi possível gravar os dados', error)
    }
  }
  await salvarConfiguracoes(db.configuracoes)
}

export async function limparTudo(): Promise<void> {
  await substituirTudo(dbVazio())
}
