/**
 * Regras do nome de usuário (login).
 *
 * Ficam num módulo próprio para poderem ser usadas fora do contexto de login
 * (ex.: a criação da equipe inicial) sem gerar importação circular.
 */

/** normaliza o nome de usuário digitado (sem espaços, acentos, minúsculo) */
export const normalizarUsuario = (valor: string) =>
  (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24)

export const validarUsuario = (valor: string) => {
  const u = normalizarUsuario(valor)
  if (u.length < 3) return 'O nome de usuário precisa ter pelo menos 3 letras.'
  if (/^[._-]/.test(u)) return 'O nome de usuário não pode começar com ponto, traço ou underline.'
  return ''
}

/** e-mail interno usado quando o login é por nome de usuário (Supabase Auth precisa de e-mail) */
export const emailInterno = (usuario: string) => `${normalizarUsuario(usuario)}@altoprints.local`

/** tamanho mínimo de senha quando a conta usa senha */
export const SENHA_MINIMA = 4

export const validarSenha = (senha: string) =>
  (senha || '').trim().length < SENHA_MINIMA
    ? `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
    : ''
