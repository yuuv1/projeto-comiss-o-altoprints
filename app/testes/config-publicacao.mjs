import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const validador = resolve(aqui, '../scripts/validar-config-supabase.mjs')
const base = { ...process.env }
delete base.VITE_SUPABASE_URL
delete base.VITE_SUPABASE_PUBLISHABLE_KEY
delete base.VITE_SUPABASE_ANON_KEY

const validar = (valores = {}) =>
  spawnSync(process.execPath, [validador], {
    encoding: 'utf8',
    env: { ...base, ...valores },
  })

const exigir = (nome, ok) => {
  if (!ok) {
    console.error(`❌ ${nome}`)
    process.exit(1)
  }
  console.log(`✅ ${nome}`)
}

const ausente = validar()
exigir('publicação bloqueia quando URL/chave do Supabase faltam', ausente.status !== 0)

const baseOnline = { VITE_SUPABASE_URL: 'https://altoprints-validacao.supabase.co' }
const publishable = validar({
  ...baseOnline,
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefghijklmnop1234567890',
})
exigir('chave pública publishable válida aceita', publishable.status === 0)

const cabecalho = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
const payloadAnon = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')
const anon = validar({
  ...baseOnline,
  VITE_SUPABASE_ANON_KEY: `${cabecalho}.${payloadAnon}.assinatura-de-teste`,
})
exigir('chave pública anon legada aceita', anon.status === 0)

const chaveSecreta = validar({
  ...baseOnline,
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abcdefghijklmnop1234567890',
})
exigir('chave secreta rejeitada', chaveSecreta.status !== 0)

const urlErrada = validar({
  VITE_SUPABASE_URL: 'https://example.com',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefghijklmnop1234567890',
})
exigir('URL que não é do Supabase rejeitada', urlErrada.status !== 0)
