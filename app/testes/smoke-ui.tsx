/**
 * Teste de fumaça da interface: renderiza o sistema num DOM simulado (jsdom)
 * e navega por todas as telas verificando se alguma quebra.
 *
 * Precisa do jsdom instalado (opcional):  npm i -D jsdom
 * Rode com:  node testes/rodar.mjs
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM(`<!doctype html><html><head><title>t</title></head><body><div id="root"></div></body></html>`, {
  url: 'https://exemplo.test/',
  pretendToBeVisual: true,
})
const w = dom.window as unknown as Record<string, unknown>
const g = globalThis as unknown as Record<string, unknown>
g.window = w
g.document = w.document
Object.defineProperty(g, 'navigator', { value: w.navigator, configurable: true })
Object.defineProperty(g, 'localStorage', { value: w.localStorage, configurable: true })
Object.defineProperty(g, 'sessionStorage', { value: w.sessionStorage, configurable: true })
for (const chave of [
  'HTMLElement','Element','Node','Event','CustomEvent','KeyboardEvent','MouseEvent','getComputedStyle',
]) {
  g[chave] = w[chave]
}
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number
g.cancelAnimationFrame = (id: number) => clearTimeout(id)
g.matchMedia = () => ({
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
})

const erros: string[] = []
const erroOriginal = console.error
console.error = (...args: unknown[]) => {
  const texto = args.map(String).join(' ')
  if (!texto.includes('not wrapped in act')) erros.push(texto)
}
dom.window.addEventListener('error', (e) => erros.push(String(e)))

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const { createRoot } = await import('react-dom/client')
  const React = await import('react')
  const { StoreProvider } = await import('../src/lib/store')
  const App = (await import('../src/App')).default
  const { HashRouter } = await import('react-router-dom')

  const raiz = dom.window.document.getElementById('root')
  createRoot(raiz as unknown as Element).render(
    React.createElement(HashRouter, null, React.createElement(StoreProvider, null, React.createElement(App))),
  )
  await espera(2000)

  const banco = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  const exemplos = ['/', '/clientes', '/vendedores', '/por-vendedor', '/para-imprimir', '/entregas',
    '/relatorio', '/relatorio-cliente-especial', '/pedido/novo', `/pedido/${banco.pedidos[0].id}`, '/rota-inexistente']

  let falhas = 0
  for (const rota of exemplos) {
    const antes = erros.length
    dom.window.location.hash = `#${rota}`
    await espera(700)
    const texto = (raiz?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const novos = erros.slice(antes)
    const ok = texto.length > 200 && novos.length === 0
    if (!ok) falhas++
    console.log(`  ${ok ? '✅' : '❌'} ${rota.padEnd(30)} ${String(texto.length).padStart(5)} caracteres`)
    if (novos.length) console.log('     erros:', novos.slice(0, 2).join(' | ').slice(0, 300))
  }
  console.log(`\n  Telas com problema: ${falhas}`)
  if (falhas) process.exit(1)
}

main().catch((e) => {
  erroOriginal('Falha geral no teste de interface:', e)
  process.exit(2)
})
