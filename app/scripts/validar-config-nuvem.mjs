/**
 * Valida a configuração obrigatória do Supabase para a publicação oficial.
 * A URL e a chave pública são incorporadas ao bundle do navegador pelo Vite;
 * nunca use aqui a chave secreta/service_role.
 */
const urlOriginal = (process.env.VITE_SUPABASE_URL ?? '').trim()
const url = urlOriginal.replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1$/, '')
const chave = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
).trim()
const erros = []

if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
  erros.push('VITE_SUPABASE_URL está ausente ou inválida (use a Project URL do Supabase).')
}

if (!chave) {
  erros.push(
    'Falta a chave pública: configure VITE_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_ANON_KEY.',
  )
} else if (chave.startsWith('sb_secret_')) {
  erros.push('Foi informada uma chave sb_secret_; use a chave pública publishable ou anon.')
} else if (chave.startsWith('sb_publishable_')) {
  const parte = chave.slice('sb_publishable_'.length)
  if (!/^[A-Za-z0-9_-]{16,}$/.test(parte)) {
    erros.push('A chave publishable parece incompleta; copie a chave pública inteira do Supabase.')
  }
} else if (chave.startsWith('eyJ')) {
  try {
    const partes = chave.split('.')
    if (partes.length !== 3 || partes.some((parte) => !parte)) throw new Error('JWT incompleto')
    const payload = JSON.parse(
      Buffer.from(partes[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    )
    if (payload.role === 'service_role') {
      erros.push('A chave JWT é service_role (secreta); use a chave pública anon.')
    } else if (payload.role !== 'anon') {
      erros.push('A chave JWT não parece ser a chave pública anon do Supabase.')
    }
  } catch {
    erros.push('A chave JWT anon está incompleta ou inválida.')
  }
} else {
  erros.push('A chave deve ser publishable (sb_publishable_...) ou anon (JWT começando com eyJ).')
}

if (erros.length) {
  console.error('\n❌ Publicação cancelada: este site oficial precisa iniciar conectado à nuvem.')
  for (const erro of erros) console.error(`  - ${erro}`)
  console.error(
    '\nConfigure a URL e a chave pública em GitHub → Settings → Secrets and variables → Actions. ' +
      'Não use nem compartilhe a senha do banco ou a chave sb_secret_/service_role.\n',
  )
  process.exit(1)
}

console.log('✅ Configuração pública do Supabase pronta; o site será publicado conectado à nuvem.')
