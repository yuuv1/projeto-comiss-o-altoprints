async function main() {
  const global = globalThis as typeof globalThis & {
    window: { location: { search: string; pathname: string; hash: string; origin: string } }
    history: { replaceState: () => void }
    localStorage: { getItem: () => null; setItem: () => void; removeItem: () => void }
    indexedDB: IDBFactory
  }
  global.window = { location: { search: '', pathname: '/', hash: '', origin: 'https://teste.invalid' } }
  global.history = { replaceState: () => {} }
  global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

  let tentouLerIndexedDB = false
  global.indexedDB = {
    open: () => {
      tentouLerIndexedDB = true
      throw new Error('registro legado de arte')
    },
  } as unknown as IDBFactory

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
