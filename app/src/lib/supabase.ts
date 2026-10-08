// Conexão com o Supabase (banco na nuvem).
//
// Preencha o arquivo .env (na pasta app/) para ativar o modo nuvem:
//   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
//
// A chave aceita é a PÚBLICA do projeto: a nova "publishable" (sb_publishable_...)
// ou a antiga "anon" (aquela longa que começa com eyJ). As duas são equivalentes e
// podem aparecer no site — o que decide o que cada um vê são as permissões do banco.
//
// ⚠️ NUNCA coloque aqui a chave SECRETA (sb_secret_...) nem a "service_role":
// elas dão acesso total ao banco e não podem sair do painel do Supabase.
// Se uma delas for colada por engano, o sistema se recusa a conectar e avisa no console.
//
// Sem essas variáveis o sistema funciona em modo local (dados no navegador).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()

/** aceita o nome novo (publishable) e o antigo (anon) */
const chave = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
)?.trim()

export type SituacaoChave = 'ok' | 'faltando' | 'secreta'

/** Confere se a chave pode ir para o site: tem que ser pública (publishable ou anon) */
export const conferirChave = (valor?: string | null): SituacaoChave => {
  const c = (valor ?? '').trim()
  if (!c) return 'faltando'
  if (c.startsWith('sb_secret_')) return 'secreta'
  return 'ok'
}

export const SITUACAO_CHAVE = conferirChave(chave)

export const CLOUD = Boolean(url && SITUACAO_CHAVE === 'ok')

if (SITUACAO_CHAVE === 'secreta') {
  console.error(
    '[Altoprints] A chave configurada é SECRETA (sb_secret_). Use a chave publishable ' +
      '(ou a anon antiga) — a secreta dá acesso total ao banco e não pode ficar no site. ' +
      'O sistema vai continuar em modo local até isso ser corrigido.',
  )
}

export const supabase: SupabaseClient | null =
  CLOUD && url ? createClient(url, chave as string) : null

export const supabaseUrl = url || ''
