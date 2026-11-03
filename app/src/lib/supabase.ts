// Conexão única do site oficial com o Supabase. Em produção, URL e chave pública
// vêm obrigatoriamente da configuração de publicação; não lemos configuração por
// aparelho, não aceitamos outro projeto por link e não caímos em armazenamento local.
// O modo de desenvolvimento/testes pode continuar sem Supabase.
//
// A chave aceita é pública: publishable (sb_publishable_...) ou anon (JWT eyJ...).
// Nunca use sb_secret_ ou service_role: dão acesso total ao banco.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type SituacaoChave = 'ok' | 'faltando' | 'secreta'

/** Confere se a chave pode ir para o site: tem que ser pública (publishable ou anon) */
export const conferirChave = (valor?: string | null): SituacaoChave => {
  const c = (valor ?? '').trim()
  if (!c) return 'faltando'
  if (c.startsWith('sb_secret_')) return 'secreta'
  // A service_role antiga também é JWT (parecida com a anon pública), então
  // confira o papel antes de permitir que ela entre em qualquer build.
  const partes = c.split('.')
  if (partes.length === 3) {
    try {
      const payload = partes[1].replace(/-/g, '+').replace(/_/g, '/')
      const preenchido = payload + '='.repeat((4 - (payload.length % 4)) % 4)
      if ((JSON.parse(atob(preenchido)) as { role?: string }).role === 'service_role') return 'secreta'
    } catch {
      // JWT malformado será recusado pela validação de publicação.
    }
  }
  return 'ok'
}

export interface ConfigNuvem {
  url: string
  chave: string
}

const CHAVE_LOCAL = 'altoprints:nuvem'
const PREFIXO_CODIGO = 'ALT1'

/* ------------------------------------------------------------------ */
/* Configuração central, inserida durante a publicação                 */
/* ------------------------------------------------------------------ */

export const nuvemObrigatoria = import.meta.env.PROD
const urlEnvOriginal = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
const urlEnv = urlEnvOriginal.replace(/\/+$/, '')
const chavePublicaEnv = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? ''
const chaveAnonimaEnv = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''
const chaveEnv = chavePublicaEnv || chaveAnonimaEnv
const urlEnvValida = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(urlEnv)
const configEnv: ConfigNuvem | null =
  urlEnvValida && conferirChave(chaveEnv) === 'ok' ? { url: urlEnv, chave: chaveEnv } : null

if (nuvemObrigatoria && !configEnv) {
  console.error(
    '[Altoprints] Configuração online ausente ou inválida. A publicação precisa incluir a URL do Supabase e a chave pública.',
  )
}
if (chaveEnv && conferirChave(chaveEnv) === 'secreta') {
  console.error(
    '[Altoprints] A chave do build é SECRETA. Use a chave publishable ou a anon; a secreta nunca pode ficar no site.',
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
    return 'Esta é uma chave SECRETA (sb_secret_/service_role). Use a chave publishable (ou a anon pública) — a secreta dá acesso total ao banco e não pode ficar no site.'
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

/**
 * Procura a URL e a chave em qualquer texto colado (mensagem, código do painel do
 * Supabase, os dois valores separados ou tudo junto). Assim a pessoa não precisa
 * saber o que é cada coisa: cola a bagunça e o sistema organiza.
 */
export function extrairConexaoDoTexto(texto: string): {
  url?: string
  chave?: string
  encontrouSecreta?: boolean
} {
  const bruto = texto ?? ''
  const url = bruto.match(/https:\/\/[a-z0-9-]+\.supabase\.(co|in)/i)?.[0]
  const secreta = /sb_secret_[A-Za-z0-9_-]+/.test(bruto)
  const publ =
    bruto.match(/sb_publishable_[A-Za-z0-9_.-]{3,}/i)?.[0] ??
    bruto.match(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/)?.[0]
  return { url, chave: publ, encontrouSecreta: secreta && !publ ? true : undefined }
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

/** A conexão do site oficial é central e não pode ser trocada por aparelho. */
export const nuvemTravadaPeloEnv = () => Boolean(configEnv) || nuvemObrigatoria

export const emNuvem = () => Boolean(cliente)
export const clienteNuvem = () => cliente

/** Em produção, toda leitura/gravação exige a conexão única do site. */
export function clienteNuvemObrigatorio() {
  if (cliente) return cliente
  if (nuvemObrigatoria)
    throw new Error(
      'O site oficial funciona somente conectado ao banco online. A publicação está sem a configuração central do Supabase; nenhum pedido, cliente, arquivo ou outro dado operacional será salvo neste aparelho.',
    )
  return null
}

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
  if (nuvemObrigatoria || configEnv)
    throw new Error('A conexão deste build é definida na publicação e não pode ser trocada por aparelho.')
  const erro = validarConexao(configNova.url, configNova.chave)
  if (erro) throw new Error(erro)
  const limpa: ConfigNuvem = { url: normalizarUrl(configNova.url), chave: configNova.chave.trim() }
  aplicar(limpa)
  if (!configEnv) gravarLocalStorage(limpa)
  return limpa
}

export function desconectar() {
  if (nuvemObrigatoria || configEnv)
    throw new Error('Este build exige a conexão central com a nuvem e não pode ser desconectado.')
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
/* Início: produção usa só a configuração central; dev aceita links    */
/* ------------------------------------------------------------------ */

;(() => {
  if (nuvemObrigatoria) {
    // O site oficial nunca usa a conexão de outro projeto guardada no aparelho
    // nem aceita links ALT1 diferentes: todos ficam presos ao mesmo Supabase.
    aplicar(configEnv)
    if (typeof window !== 'undefined') {
      try {
        const parametros = new URLSearchParams(window.location.search)
        if (parametros.has('nuvem')) {
          parametros.delete('nuvem')
          const resto = parametros.toString()
          history.replaceState(
            null,
            '',
            `${window.location.pathname}${resto ? `?${resto}` : ''}${window.location.hash}`,
          )
        }
      } catch {
        /* a URL não interfere na conexão central do site */
      }
    }
    return
  }

  // Em desenvolvimento, link/código e configuração do aparelho continuam úteis
  // para testar a interface sem alterar a conexão da publicação oficial.
  if (typeof window !== 'undefined') {
    try {
      const parametros = new URLSearchParams(window.location.search)
      const doLink = parametros.get('nuvem')
      if (doLink) {
        const recebida = lerCodigoConexao(doLink)
        aplicar(recebida)
        gravarLocalStorage(recebida)
        recebidaAgora = true
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
  }

  if (configEnv) {
    aplicar(configEnv)
    return
  }

  const local = lerLocalStorage()
  if (local) aplicar(local)
})()
