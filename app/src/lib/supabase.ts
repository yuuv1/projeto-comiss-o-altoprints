// Conexão com o Supabase (banco na nuvem) — configurável DENTRO do sistema.
//
// O proprietário abre Configurações → Nuvem, cola a URL do projeto e a chave pública,
// e pronto: a conexão fica guardada neste aparelho. Para os outros aparelhos, o sistema
// gera um LINK (ou um código) que, aberto uma vez, conecta aquele celular sozinho.
//
// A chave aceita é a PÚBLICA do projeto: a nova "publishable" (sb_publishable_...) ou a
// antiga "anon" (a sequência longa que começa com eyJ). As duas são equivalentes e podem
// aparecer no site — o que decide o que cada pessoa vê são o login e as permissões.
//
// ⚠️ NUNCA use a chave SECRETA (sb_secret_...) nem a "service_role": elas dão acesso
// total ao banco. Se uma delas for colada por engano, o sistema se recusa a conectar.
//
// Também funciona por arquivo .env (opcional, para quem já usa):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type SituacaoChave = 'ok' | 'faltando' | 'secreta'

/** Confere se a chave pode ir para o site: tem que ser pública (publishable ou anon) */
export const conferirChave = (valor?: string | null): SituacaoChave => {
  const c = (valor ?? '').trim()
  if (!c) return 'faltando'
  if (c.startsWith('sb_secret_')) return 'secreta'
  return 'ok'
}

export interface ConfigNuvem {
  url: string
  chave: string
}

const CHAVE_LOCAL = 'altoprints:nuvem'
const PREFIXO_CODIGO = 'ALT1'

/* ------------------------------------------------------------------ */
/* Ajustes vindos do arquivo .env (opcional)                           */
/* ------------------------------------------------------------------ */

const urlEnv = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
const chaveEnv =
  ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined))?.trim() ?? ''
const configEnv: ConfigNuvem | null =
  urlEnv && conferirChave(chaveEnv) === 'ok' ? { url: urlEnv, chave: chaveEnv } : null

if (chaveEnv && conferirChave(chaveEnv) === 'secreta') {
  console.error(
    '[Altoprints] A chave do arquivo .env é SECRETA (sb_secret_). Use a chave publishable ' +
      '(ou a anon antiga) — a secreta dá acesso total ao banco e não pode ficar no site.',
  )
}

/* ------------------------------------------------------------------ */
/* Normalização, código e link de conexão                              */
/* ------------------------------------------------------------------ */

/** Aceita a URL colada de qualquer jeito (com /, com espaço) e devolve o endereço limpo */
export const normalizarUrl = (valor: string) =>
  (valor || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|storage)\/v1$/, '')

/** Confere as duas informações e devolve o que está errado (vazio = tudo certo) */
export function validarConexao(url: string, chave: string): string {
  const u = normalizarUrl(url)
  if (!u) return 'Cole a URL do projeto (aquele endereço que termina em .supabase.co).'
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u))
    return 'A URL não parece ser de um projeto Supabase. Ela é assim: https://seuprojeto.supabase.co'
  const situacao = conferirChave(chave)
  if (situacao === 'faltando') return 'Cole a chave pública do projeto (publishable ou anon).'
  if (situacao === 'secreta')
    return 'Esta é a chave SECRETA (sb_secret_). Use a chave publishable (ou a anon antiga) — a secreta dá acesso total ao banco e não pode ficar no site.'
  return ''
}

const paraBase64Url = (texto: string) =>
  btoa(unescape(encodeURIComponent(texto))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const deBase64Url = (codigo: string) => {
  const comPadding = codigo.replace(/-/g, '+').replace(/_/g, '/')
  const sobra = comPadding.length % 4
  const texto = atob(sobra ? comPadding + '='.repeat(4 - sobra) : comPadding)
  return decodeURIComponent(escape(texto))
}

/** Código que carrega a conexão (para mandar no grupo, sem link longo incomodando) */
export const montarCodigoConexao = (config: ConfigNuvem) =>
  `${PREFIXO_CODIGO}.${paraBase64Url(JSON.stringify({ u: normalizarUrl(config.url), c: config.chave }))}`

/** Lê um código (ou um link que contenha o código) e devolve a conexão validada */
export function lerCodigoConexao(entrada: string): ConfigNuvem {
  const texto = (entrada || '').trim()
  if (!texto) throw new Error('Cole o código ou o link de conexão.')
  // aceita um link inteiro: procura o código dentro dele
  const achado = texto.match(/ALT1\.[A-Za-z0-9\-_]+/)
  if (!achado) throw new Error('Este código não parece ser do sistema (ele começa com "ALT1.").')
  let dados: { u?: string; c?: string }
  try {
    dados = JSON.parse(deBase64Url(achado[0].slice(PREFIXO_CODIGO.length + 1)))
  } catch {
    throw new Error('Não foi possível ler este código. Confira se ele foi copiado por completo.')
  }
  const erro = validarConexao(dados.u ?? '', dados.c ?? '')
  if (erro) throw new Error(erro)
  return { url: normalizarUrl(dados.u ?? ''), chave: (dados.c ?? '').trim() }
}

/* ------------------------------------------------------------------ */
/* Estado da conexão                                                   */
/* ------------------------------------------------------------------ */

let config: ConfigNuvem | null = null
let cliente: SupabaseClient | null = null
/** recebida agora (link aberto): usada para avisar "conectado!" */
let recebidaAgora = false

const criar = (c: ConfigNuvem): SupabaseClient => createClient(c.url, c.chave)

const aplicar = (c: ConfigNuvem | null) => {
  config = c
  cliente = c ? criar(c) : null
}

/** true quando o .env manda (aí a tela não deixa desconectar) */
export const nuvemTravadaPeloEnv = () => Boolean(configEnv)

export const emNuvem = () => Boolean(cliente)
export const clienteNuvem = () => cliente
export const configNuvem = () => config
export const conexaoRecebidaAgora = () => recebidaAgora

export const limparAvisoDeConexao = () => {
  recebidaAgora = false
}

const lerLocalStorage = (): ConfigNuvem | null => {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL)
    if (!bruto) return null
    const dados = JSON.parse(bruto) as ConfigNuvem
    if (validarConexao(dados.url, dados.chave)) return null
    return { url: normalizarUrl(dados.url), chave: dados.chave.trim() }
  } catch {
    return null
  }
}

const gravarLocalStorage = (c: ConfigNuvem | null) => {
  try {
    if (c) localStorage.setItem(CHAVE_LOCAL, JSON.stringify(c))
    else localStorage.removeItem(CHAVE_LOCAL)
  } catch {
    /* navegador sem armazenamento: segue só na memória */
  }
}

/** Conecta (guarda neste aparelho) — as informações já precisam ter passado por validarConexao */
export function conectar(configNova: ConfigNuvem) {
  const erro = validarConexao(configNova.url, configNova.chave)
  if (erro) throw new Error(erro)
  const limpa: ConfigNuvem = { url: normalizarUrl(configNova.url), chave: configNova.chave.trim() }
  aplicar(limpa)
  if (!configEnv) gravarLocalStorage(limpa)
  return limpa
}

export function desconectar() {
  if (configEnv) throw new Error('Esta versão do site já vem com a nuvem configurada e não pode ser desconectada por aqui.')
  aplicar(null)
  gravarLocalStorage(null)
}

/** Código da conexão atual (a equipe pode colar na tela "Conectar à nuvem") */
export const codigoConexao = () => (config ? montarCodigoConexao(config) : '')

/** Link de conexão para a equipe: abre uma vez e o aparelho fica conectado */
export const linkDeConexao = () => {
  if (!config) return ''
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}?nuvem=${encodeURIComponent(montarCodigoConexao(config))}`
}

/* ------------------------------------------------------------------ */
/* Início: .env, código guardado ou link recebido                      */
/* ------------------------------------------------------------------ */

;(() => {
  // 1) link recebido (?nuvem=CODIGO) tem prioridade e é guardado no aparelho
  try {
    const parametros = new URLSearchParams(window.location.search)
    const doLink = parametros.get('nuvem')
    if (doLink) {
      const recebida = lerCodigoConexao(doLink)
      aplicar(recebida)
      if (!configEnv) gravarLocalStorage(recebida)
      recebidaAgora = true
      // limpa o endereço para o código não ficar aparecendo na barra
      parametros.delete('nuvem')
      const resto = parametros.toString()
      history.replaceState(
        null,
        '',
        `${window.location.pathname}${resto ? `?${resto}` : ''}${window.location.hash}`,
      )
      return
    }
  } catch (erro) {
    console.warn('[Altoprints] Link de conexão inválido:', (erro as Error).message)
  }

  // 2) arquivo .env (versões mais antigas/quem preferir por lá)
  if (configEnv) {
    aplicar(configEnv)
    return
  }

  // 3) conexão já guardada neste aparelho
  const local = lerLocalStorage()
  if (local) aplicar(local)
})()
