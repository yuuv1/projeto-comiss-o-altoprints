async function main() {
  const global = globalThis as typeof globalThis & {
    window: { location: { search: string; pathname: string; hash: string; origin: string } }
    history: { replaceState: () => void }
    localStorage: { getItem: (key: string) => null; setItem: () => void; removeItem: () => void }
    indexedDB: IDBFactory
    fetch: typeof fetch
  }
  global.window = { location: { search: '', pathname: '/', hash: '', origin: 'https://teste.invalid' } }
  global.history = { replaceState: () => {} }
  let leuBancoLegado = false
  global.localStorage = {
    getItem: (key) => {
      if (key === 'altoprints:db:v1') leuBancoLegado = true
      return null
    },
    setItem: () => {},
    removeItem: () => {},
  }
  global.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }

  let tentouLerIndexedDB = false
  global.indexedDB = {
    open: () => {
      tentouLerIndexedDB = true
      throw new Error('registro legado de arte')
    },
  } as unknown as IDBFactory

  const { carregarTudo } = await import('../src/lib/backend')
  let leituraOnlineFalhou = false
  try {
    await carregarTudo()
  } catch {
    leituraOnlineFalhou = true
  }
  if (!leituraOnlineFalhou) throw new Error('o teste deveria simular indisponibilidade do Supabase')
  if (leuBancoLegado || tentouLerIndexedDB)
    throw new Error('falha de rede no Supabase fez produção consultar o banco local legado')
  console.log('✅ falha de rede no Supabase não consulta o banco local legado')

  const { urlDoArquivo } = await import('../src/lib/files')
  const url = await urlDoArquivo({
    id: 'arte-legada',
    pedido_id: 'pedido-antigo',
    nome: 'arte.png',
    tipo: 'image/png',
    tamanho: 1,
    url: '',
    created_at: new Date(0).toISOString(),
  })

  if (tentouLerIndexedDB) throw new Error('produção tentou ler uma arte local antiga do IndexedDB')
  if (url !== null) throw new Error('produção deveria informar que não existe arte online sem URL no Supabase')
  console.log('✅ produção com Supabase não lê anexos locais antigos do IndexedDB')
}

void main().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
