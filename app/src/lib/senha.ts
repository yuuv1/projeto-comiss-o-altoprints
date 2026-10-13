// Senha do painel administrativo (comissões e configurações)
// Sem senha definida, o acesso é livre (primeiro uso); os funcionários definem a senha
// e a partir daí o sistema pede a senha para entrar no painel.

const SAL_APP = 'altoprints::painel'

export const TEM_SENHA = (hash: string) => Boolean(hash && hash.trim().length > 0)

/** Gera um hash simples (SHA-256 + sal do sistema) — não guardamos a senha em texto puro */
export async function gerarHashSenha(senha: string): Promise<string> {
  const texto = `${SAL_APP}::${senha}`
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const dados = new TextEncoder().encode(texto)
    const digest = await crypto.subtle.digest('SHA-256', dados)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // reserva (navegadores antigos / contexto não seguro)
  let h = 5381
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h) ^ texto.charCodeAt(i)
  return `djb2-${(h >>> 0).toString(16)}`
}

export async function senhaConfere(senha: string, hash: string): Promise<boolean> {
  if (!TEM_SENHA(hash)) return true
  return (await gerarHashSenha(senha)) === hash
}
