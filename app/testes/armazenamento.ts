/**
 * Testes do armazenamento do navegador (o problema do "sem espaço").
 *
 * Um DOM simulado (jsdom) não tem IndexedDB de verdade, então aqui entra o
 * `fake-indexeddb`, que se comporta como o do navegador. Com ele dá para testar
 * o caminho completo:
 *   localStorage cheio  →  banco copiado para o IndexedDB  →  espaço liberado
 * e também o socorro quando o navegador não deixa salvar nada.
 *
 * Rode com:  npm run testar
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://exemplo.test/' })
const w = dom.window as unknown as Record<string, unknown>
const g = globalThis as unknown as Record<string, unknown>
g.window = w
g.document = w.document
Object.defineProperty(g, 'navigator', { value: w.navigator, configurable: true })

/** armazenamento de mentira: lê e apaga normalmente, mas não deixa gravar nada */
function armazenamentoBloqueado(dados: Map<string, string>) {
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: () => {
      throw new Error("Failed to execute 'setItem' on 'Storage': exceeded the quota.")
    },
    removeItem: (k: string) => void dados.delete(k),
    key: (i: number) => [...dados.keys()][i] ?? null,
    get length() {
      return dados.size
    },
  }
}

let ok = 0
const falhas: string[] = []
const igual = (descricao: string, recebido: unknown, esperado: unknown) => {
  if (JSON.stringify(recebido) === JSON.stringify(esperado)) ok++
  else
    falhas.push(
      `${descricao}\n     recebido: ${JSON.stringify(recebido)}\n     esperado: ${JSON.stringify(esperado)}`,
    )
}
const verdadeiro = (descricao: string, valor: unknown) => igual(descricao, Boolean(valor), true)

const espera = () => new Promise((r) => setTimeout(r, 20))

async function main() {
  const armazenamento = await import('../src/lib/armazenamento')
  const local = await import('../src/lib/local')
  const { indexedDB } = await import('fake-indexeddb')

  const bancoGrande = JSON.stringify({
    pedidos: Array.from({ length: 400 }, (_, i) => ({ i, nome: 'x'.repeat(200) })),
  })

  /* ------------- 1) navegador normal, banco ainda no localStorage ------------- */
  g.indexedDB = indexedDB
  const real = new Map<string, string>()
  g.localStorage = armazenamentoBloqueado(real) // por enquanto só para gravar o cenário
  Object.defineProperty(g.localStorage, 'setItem', {
    value: (k: string, v: string) => void real.set(k, v),
    configurable: true,
  })
  real.set('altoprints:db:v1', bancoGrande)

  const liberado = await armazenamento.liberarCopiaAntiga(bancoGrande)
  await espera()
  verdadeiro('banco grande migra do localStorage para o IndexedDB', liberado > 0)
  igual('a cópia antiga sai do localStorage', real.get('altoprints:db:v1'), undefined)
  igual('onde está guardado agora', await armazenamento.ondeEstaGuardado(), 'IndexedDB')
  igual('o banco continua legível', await armazenamento.lerBancoBruto(), bancoGrande)

  /* ------------- 2) chamar de novo não muda nada (é seguro repetir) ----------- */
  igual('rodar a limpeza de novo não libera nada', await armazenamento.liberarCopiaAntiga(bancoGrande), 0)

  /* ------------- 3) navegador SEM IndexedDB: não pode apagar o banco ---------- */
  g.indexedDB = undefined
  real.set('altoprints:db:v1', bancoGrande)
  igual('sem IndexedDB, o banco continua legível', await armazenamento.lerBancoBruto(), bancoGrande)
  igual('sem IndexedDB, a limpeza não mexe em nada', await armazenamento.liberarCopiaAntiga(bancoGrande), 0)
  igual(
    'sem IndexedDB, o banco continua guardado',
    real.get('altoprints:db:v1'),
    bancoGrande,
  )

  /* ------------- 4) navegador que não deixa salvar NADA (janela anônima) ------ */
  g.indexedDB = indexedDB // volta o IndexedDB: aqui só o localStorage está bloqueado
  real.set('altoprints:db:v1', bancoGrande)
  await armazenamento.gravarBancoBruto(bancoGrande)
  real.set('altoprints:db:v1', bancoGrande)
  g.localStorage = armazenamentoBloqueado(real)
  const diagnosticoComIDB = await armazenamento.testarArmazenamento()
  igual('testar o armazenamento não apaga o banco', await armazenamento.lerBancoBruto(), bancoGrande)
  igual('diagnóstico: IndexedDB funcionando', diagnosticoComIDB.idbOk, true)
  igual('diagnóstico: onde está guardado', diagnosticoComIDB.onde, 'IndexedDB')

  /* ------------- 5) navegador que não deixa salvar NADA (janela anônima) ------ */
  g.indexedDB = undefined
  igual('gravação protegida devolve false em vez de estourar', local.lsGravar('altoprints:tentativas', '{}'), false)
  igual('leitura continua funcionando', typeof local.lsLer('altoprints:db:v1'), 'string')
  igual('o navegador é reconhecido como bloqueado', local.consegueGravar(), false)
  const diagnostico = await armazenamento.testarArmazenamento()
  igual('diagnóstico: sem espaço para gravar', diagnostico.localOk, false)
  igual('diagnóstico: IndexedDB indisponível', diagnostico.idbOk, false)
  verdadeiro('diagnóstico lista os maiores ocupantes', diagnostico.ocupantes.length > 0)
  igual(
    'diagnóstico: o banco antigo aparece como o maior ocupante',
    diagnostico.ocupantes[0]?.chave,
    'altoprints:db:v1',
  )

  /* ------------- 6) socorro: limpar as chaves do sistema libera espaço -------- */
  real.set('altoprints:outra-coisa', 'x'.repeat(100))
  const liberadoSocorro = local.limparChavesDoSistema()
  verdadeiro('o socorro libera o espaço das chaves do sistema', liberadoSocorro > 0)
  igual('o banco antigo sai de vez', real.get('altoprints:db:v1'), undefined)
  igual(
    'chaves do sistema somem todas',
    local.lsChaves().filter((c) => c.startsWith('altoprints:')),
    [],
  )
  igual('outras chaves do site não são tocadas', real.get('altoprints:outra-coisa'), undefined)

  /* ------------------------------- resultado ----------------------------- */
  console.log(`\n✅ ${ok} verificações passaram`)
  if (falhas.length) {
    console.log(`\n❌ ${falhas.length} falha(s):`)
    for (const f of falhas) console.log('  - ' + f)
    process.exit(1)
  }
}

main().catch((e) => {
  console.log('erro nos testes de armazenamento:', e)
  process.exit(1)
})
