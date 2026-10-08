// Camada de persistência: funciona com Supabase (nuvem) ou localStorage (modo local)
import { migrarFaixas } from './comissao'
import { CLOUD, supabase } from './supabase'
import {
  CONFIG_PADRAO,
  type Arquivo,
  type Cliente,
  type Configuracoes,
  type DB,
  type ID,
  type Pedido,
  type Usuario,
  type Vendedor,
} from './types'

export type Tabela = 'vendedores' | 'clientes' | 'pedidos' | 'arquivos' | 'usuarios'
export type Registro = Vendedor | Cliente | Pedido | Arquivo | Usuario

const LS_KEY = 'altoprints:db:v1'

/** mantém as faixas de comissão no formato/valores atuais do sistema */
const comFaixasAtuais = (c: Configuracoes): Configuracoes => ({
  ...c,
  faixas_comissao: migrarFaixas(c.faixas_comissao),
})

const dbVazio = (): DB => ({
  vendedores: [],
  clientes: [],
  pedidos: [],
  arquivos: [],
  usuarios: [],
  configuracoes: { ...CONFIG_PADRAO },
})

/* ------------------------------------------------------------------ */
/* Modo local (localStorage)                                           */
/* ------------------------------------------------------------------ */

const lerLocal = (): DB => {
  try {
    const bruto = localStorage.getItem(LS_KEY)
    if (!bruto) return dbVazio()
    const parsed = JSON.parse(bruto) as Partial<DB>
    return {
      vendedores: parsed.vendedores ?? [],
      clientes: parsed.clientes ?? [],
      pedidos: parsed.pedidos ?? [],
      arquivos: parsed.arquivos ?? [],
      usuarios: parsed.usuarios ?? [],
      configuracoes: comFaixasAtuais({ ...CONFIG_PADRAO, ...(parsed.configuracoes ?? {}) }),
    }
  } catch {
    return dbVazio()
  }
}

const gravarLocal = (db: DB) => {
  localStorage.setItem(LS_KEY, JSON.stringify(db))
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
  throw new Error(`${contexto}: ${msg}`)
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

export const MODO_NUVEM = CLOUD

export async function carregarTudo(): Promise<DB> {
  if (!CLOUD || !supabase) return lerLocal()

  const [vendedores, clientes, pedidos, arquivos, usuarios, config] = await Promise.all([
    supabase.from('vendedores').select('*').order('nome', { ascending: true }),
    supabase.from('clientes').select('*').order('nome', { ascending: true }),
    supabase.from('pedidos').select('*').order('numero', { ascending: false }),
    supabase.from('arquivos').select('*').order('created_at', { ascending: false }),
    supabase.from('usuarios').select('*').order('nome', { ascending: true }),
    supabase.from('configuracoes').select('*').eq('id', 1).maybeSingle(),
  ])

  for (const res of [vendedores, clientes, pedidos, arquivos, usuarios, config]) {
    if (res.error) tratarErro('Não foi possível carregar os dados', res.error)
  }

  const cfg = (config.data?.valor ?? {}) as Partial<Configuracoes>

  return {
    vendedores: (vendedores.data ?? []) as Vendedor[],
    clientes: (clientes.data ?? []) as Cliente[],
    pedidos: (pedidos.data ?? []) as Pedido[],
    arquivos: (arquivos.data ?? []) as Arquivo[],
    usuarios: (usuarios.data ?? []) as Usuario[],
    configuracoes: comFaixasAtuais({ ...CONFIG_PADRAO, ...cfg }),
  }
}

export async function salvarRegistro(tabela: Tabela, registro: Registro): Promise<void> {
  if (!CLOUD || !supabase) {
    const db = lerLocal()
    const lista = db[tabela] as Registro[]
    const i = lista.findIndex((r) => r.id === registro.id)
    if (i >= 0) lista[i] = registro
    else lista.push(registro)
    gravarLocal(db)
    return
  }
  const { error } = await supabase.from(tabela).upsert(registro as never)
  if (error) tratarErro('Não foi possível salvar', error)
}

export async function salvarVarios(tabela: Tabela, registros: Registro[]): Promise<void> {
  if (!registros.length) return
  if (!CLOUD || !supabase) {
    const db = lerLocal()
    const lista = db[tabela] as Registro[]
    for (const registro of registros) {
      const i = lista.findIndex((r) => r.id === registro.id)
      if (i >= 0) lista[i] = registro
      else lista.push(registro)
    }
    gravarLocal(db)
    return
  }
  const { error } = await supabase.from(tabela).upsert(registros as never)
  if (error) tratarErro('Não foi possível salvar', error)
}

export async function removerRegistro(tabela: Tabela, id: ID): Promise<void> {
  if (!CLOUD || !supabase) {
    const db = lerLocal()
    db[tabela] = (db[tabela] as Registro[]).filter((r) => r.id !== id) as never
    gravarLocal(db)
    return
  }
  const { error } = await supabase.from(tabela).delete().eq('id', id)
  if (error) tratarErro('Não foi possível excluir', error)
}

export async function removerArquivosDoPedido(pedidoId: ID): Promise<void> {
  if (!CLOUD || !supabase) {
    const db = lerLocal()
    db.arquivos = db.arquivos.filter((a) => a.pedido_id !== pedidoId)
    gravarLocal(db)
    return
  }
  const { error } = await supabase.from('arquivos').delete().eq('pedido_id', pedidoId)
  if (error) tratarErro('Não foi possível excluir os arquivos', error)
}

export async function salvarConfiguracoes(parcial: Partial<Configuracoes>): Promise<void> {
  if (!CLOUD || !supabase) {
    const db = lerLocal()
    db.configuracoes = { ...db.configuracoes, ...parcial }
    gravarLocal(db)
    return
  }
  const atual = (await supabase.from('configuracoes').select('*').eq('id', 1).maybeSingle()).data
  const valor = { ...((atual?.valor ?? {}) as Partial<Configuracoes>), ...parcial }
  const { error } = await supabase.from('configuracoes').upsert({ id: 1, valor })
  if (error) tratarErro('Não foi possível salvar as configurações', error)
}

/** Apaga tudo (usado pelo botão de limpar dados / recarregar demonstração) */
export async function substituirTudo(db: DB): Promise<void> {
  if (!CLOUD || !supabase) {
    gravarLocal(db)
    return
  }
  for (const t of ['vendedores', 'clientes', 'pedidos', 'arquivos', 'usuarios'] as Tabela[]) {
    const { error } = await supabase.from(t).delete().not('id', 'is', null)
    if (error) tratarErro('Não foi possível limpar os dados', error)
  }
  for (const t of ['vendedores', 'clientes', 'pedidos', 'arquivos', 'usuarios'] as Tabela[]) {
    const linhas = db[t] as Registro[]
    if (!linhas.length) continue
    const { error } = await supabase.from(t).insert(linhas as never)
    if (error) tratarErro('Não foi possível gravar os dados', error)
  }
  await salvarConfiguracoes(db.configuracoes)
}

export async function limparTudo(): Promise<void> {
  await substituirTudo(dbVazio())
}
