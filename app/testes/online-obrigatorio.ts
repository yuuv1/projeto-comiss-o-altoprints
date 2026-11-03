const exigirErroOnline = async (nome: string, acao: () => Promise<unknown>) => {
  try {
    await acao()
  } catch (erro) {
    if ((erro as Error).message.includes('somente conectado ao banco online')) {
      console.log(`✅ produção bloqueia fallback local em ${nome}`)
      return
    }
    throw erro
  }
  throw new Error(`❌ produção deixou ${nome} continuar sem Supabase`)
}

async function main() {
  // supabase.ts lê a URL da página ao iniciar; o teste fornece uma página sem
  // configuração para provar que o build de produção continua fail-closed.
  const global = globalThis as typeof globalThis & {
    window: { location: { search: string; pathname: string; hash: string; origin: string } }
    history: { replaceState: () => void }
    localStorage: { getItem: () => null; setItem: () => void; removeItem: () => void }
  }
  global.window = { location: { search: '', pathname: '/', hash: '', origin: 'https://teste.invalid' } }
  global.history = { replaceState: () => {} }
  global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

  const { carregarTudo, removerRegistro, salvarRegistro } = await import('../src/lib/backend')
  const { enviarArquivo } = await import('../src/lib/files')

  await exigirErroOnline('leitura', () => carregarTudo())
  await exigirErroOnline('gravação', () => salvarRegistro('clientes', { id: 'teste' } as never))
  await exigirErroOnline('exclusão', () => removerRegistro('clientes', 'teste'))
  await exigirErroOnline('arquivo', () => enviarArquivo('teste', { name: 'teste.png', type: 'image/png', size: 0 } as File))
}

void main().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
