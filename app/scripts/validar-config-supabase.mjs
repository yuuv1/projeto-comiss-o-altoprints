const urlBruta = (process.env.VITE_SUPABASE_URL ?? '').trim()
const url = urlBruta.replace(/\/+$/, '')
const chavePublishable = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
const chaveAnon = (process.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
const chave = chavePublishable || chaveAnon
const erros = []

if (!url) {
  erros.push('VITE_SUPABASE_URL está ausente.')
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
  erros.push('VITE_SUPABASE_URL não parece ser a URL pública de um projeto Supabase.')
}

if (!chave) {
  erros.push('Informe VITE_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_ANON_KEY.')
} else if (chave.startsWith('sb_secret_')) {
  erros.push('A chave configurada é secreta; use somente publishable ou anon.')
} else if (chave.startsWith('sb_publishable_')) {
  if (!/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(chave))
    erros.push('A chave publishable parece incompleta ou inválida.')
} else if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(chave)) {
  try {
    const payload = JSON.parse(Buffer.from(chave.split('.')[1], 'base64url').toString('utf8'))
    if (payload.role !== 'anon') erros.push('O JWT informado não é uma chave anon pública.')
  } catch {
    erros.push('A chave anon não é um JWT válido.')
  }
} else {
  erros.push('A chave precisa ser publishable (sb_publishable_...) ou anon (JWT público).')
}

if (erros.length) {
  console.error('\n❌ Publicação bloqueada: o site oficial exige a conexão central do Supabase.')
  for (const erro of erros) console.error(`   - ${erro}`)
  console.error('   Configure URL + chave pública nas variáveis do ambiente de publicação.\n')
  process.exit(1)
}

console.log('✅ Configuração central do Supabase validada (URL + chave pública).')
