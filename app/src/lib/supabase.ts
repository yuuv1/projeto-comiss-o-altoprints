// Conexão com o Supabase (banco na nuvem).
// Preencha o arquivo .env (ou as variáveis no serviço de hospedagem) para ativar o modo nuvem.
// Sem essas variáveis o sistema funciona em modo local (dados no navegador).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const CLOUD = Boolean(url && anon)

export const supabase: SupabaseClient | null = CLOUD ? createClient(url as string, anon as string) : null

export const supabaseUrl = url || ''
