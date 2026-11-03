/**
 * Regras do identificador de acesso do proprietário.
 *
 * Mantemos os nomes de usuário antigos funcionando e também aceitamos um e-mail
 * completo como login. O e-mail é apenas o identificador salvo no banco do app;
 * não é uma conta do Supabase Auth nem passa por confirmação de endereço.
 */

const EMAIL_LOGIN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** normaliza e-mail completo ou nome de usuário (sem acentos/espaços, minúsculo) */
export const normalizarUsuario = (valor: string) => {
  const texto = (valor || '').trim()
  if (EMAIL_LOGIN.test(texto)) return texto.toLowerCase()
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24)
}

export const validarUsuario = (valor: string) => {
  const texto = (valor || '').trim()
  if (texto.includes('@')) {
    if (texto.length > 254 || !EMAIL_LOGIN.test(texto)) return 'Digite um e-mail válido para usar como login.'
    return ''
  }

  const u = normalizarUsuario(texto)
  if (u.length < 3) return 'O nome de usuário precisa ter pelo menos 3 letras.'
  if (/^[._-]/.test(u)) return 'O nome de usuário não pode começar com ponto, traço ou underline.'
  return ''
}

/** e-mail aceito pelo Supabase Auth; para nomes antigos, mantém o endereço interno */
export const emailInterno = (usuario: string) => {
  const login = normalizarUsuario(usuario)
  return EMAIL_LOGIN.test(login) ? login : `${login}@altoprints.local`
}

/** tamanho mínimo atual de senha quando a conta usa senha */
export const SENHA_MINIMA = 4

export const validarSenha = (senha: string) =>
  (senha || '').trim().length < SENHA_MINIMA
    ? `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
    : ''
