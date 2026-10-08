/**
 * Teste de fumaça da interface: abre o sistema num DOM simulado (jsdom),
 * entra com uma conta de proprietário e navega por TODAS as telas,
 * depois repete com uma conta de vendedor conferindo o que ele vê.
 *
 * Rode com:  npm run testar
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
for (const chave of ['HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'getComputedStyle']) {
  g[chave] = w[chave]
}
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number
g.cancelAnimationFrame = (id: number) => clearTimeout(id)
g.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })

const erros: string[] = []
const erroOriginal = console.error
console.error = (...args: unknown[]) => {
  const texto = args.map(String).join(' ')
  if (!texto.includes('not wrapped in act')) erros.push(texto)
}
dom.window.addEventListener('error', (e) => erros.push(String(e)))

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** prepara banco de exemplo + contas de acesso antes de abrir o sistema */
async function prepararAmbiente() {
  const { gerarDadosDemo } = await import('../src/lib/seed')
  const { gerarHashSenha } = await import('../src/lib/senha')
  const { novoId } = await import('../src/lib/files')

  const banco = gerarDadosDemo()
  const dono = {
    id: novoId(),
    nome: 'DONO TESTE',
    usuario: 'dono',
    senha_hash: await gerarHashSenha('1234'),
    papel: 'proprietario' as const,
    vendedor_id: '',
    ativo: true,
    criado_em: new Date().toISOString(),
  }
  const vendedor = {
    id: novoId(),
    nome: 'VENDEDOR TESTE',
    usuario: 'vendedor',
    senha_hash: await gerarHashSenha('1234'),
    papel: 'vendedor' as const,
    vendedor_id: banco.vendedores[0].id,
    ativo: true,
    criado_em: new Date().toISOString(),
  }

  banco.usuarios = [dono, vendedor]
  dom.window.localStorage.setItem('altoprints:db:v1', JSON.stringify(banco))

  return { banco, dono, vendedor }
}

function sessaoDe(id: string) {
  dom.window.localStorage.setItem(
    'altoprints:sessao',
    JSON.stringify({
      usuario_id: id,
      expira_em: new Date(Date.now() + 86400000).toISOString(),
      conectado: true,
    }),
  )
}

async function main() {
  const { dono, vendedor } = await prepararAmbiente()
  sessaoDe(dono.id)

  const { createRoot } = await import('react-dom/client')
  const React = await import('react')
  const { StoreProvider } = await import('../src/lib/store')
  const { AuthProvider } = await import('../src/lib/auth')
  const App = (await import('../src/App')).default
  const { HashRouter } = await import('react-router-dom')

  const raiz = dom.window.document.getElementById('root')
  createRoot(raiz as unknown as Element).render(
    React.createElement(
      HashRouter,
      null,
      React.createElement(
        StoreProvider,
        null,
        React.createElement(AuthProvider, null, React.createElement(App)),
      ),
    ),
  )
  await espera(2500)

  const banco = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  const idPedido = banco.pedidos.find(
    (p: { vendedor_id: string }) => p.vendedor_id === vendedor.vendedor_id,
  )?.id

  let falhas = 0

  const visitar = async (rotulo: string, rotas: string[], esperaTexto?: string) => {
    console.log(`\n  ${rotulo}`)
    for (const rota of rotas) {
      const antes = erros.length
      dom.window.location.hash = `#${rota}`
      await espera(650)
      const texto = (raiz?.textContent ?? '').replace(/\s+/g, ' ').trim()
      const novos = erros.slice(antes)
      const temTexto = texto.length > 200
      const temEsperado = esperaTexto ? texto.includes(esperaTexto) : true
      const ok = temTexto && !novos.length && temEsperado
      if (!ok) falhas++
      console.log(`  ${ok ? '✅' : '❌'} ${rota.padEnd(32)} ${String(texto.length).padStart(5)} caracteres`)
      if (novos.length) console.log('     erros:', novos.slice(0, 2).join(' | ').slice(0, 300))
      if (!temEsperado) console.log(`     faltou o texto esperado: "${esperaTexto}"`)
    }
  }

  await visitar('Proprietário (vê tudo)', [
    '/',
    '/pedidos',
    '/clientes',
    '/vendedores',
    '/por-vendedor',
    '/para-imprimir',
    '/entregas',
    '/relatorio',
    '/relatorio-cliente-especial',
    '/equipe',
    '/configuracoes',
    '/pedido/novo',
    `/pedido/${idPedido}`,
    '/rota-inexistente',
  ])

  // confere se o painel do dono realmente mostra o painel
  dom.window.location.hash = '#/'
  await espera(600)
  const painel = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const temPainel = painel.includes('Painel do proprietário')
  if (!temPainel) falhas++
  console.log(`  ${temPainel ? '✅' : '❌'} início do proprietário mostra o painel geral`)

  // agora entra como vendedor
  sessaoDe(vendedor.id)
  dom.window.location.reload?.()
  const { StoreProvider: SP2 } = await import('../src/lib/store')
  const { AuthProvider: AP2 } = await import('../src/lib/auth')
  const raiz2 = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(raiz2)
  createRoot(raiz2 as unknown as Element).render(
    React.createElement(
      HashRouter,
      null,
      React.createElement(SP2, null, React.createElement(AP2, null, React.createElement(App))),
    ),
  )
  await espera(2200)
  dom.window.location.hash = '#/'
  await espera(700)
  const textoVendedor = (raiz2.textContent ?? '').replace(/\s+/g, ' ')

  const checagens: [string, boolean][] = [
    ['vendedor vê "Minha área"', textoVendedor.includes('Minha área') || textoVendedor.includes('Sua área')],
    ['vendedor vê o nome dele na saudação', textoVendedor.toLowerCase().includes('vendedor teste')],
    ['vendedor NÃO vê o Painel do proprietário', !textoVendedor.includes('Painel do proprietário')],
  ]
  console.log('\n  Vendedor (vê só o dele)')
  for (const [rotulo, ok] of checagens) {
    if (!ok) falhas++
    console.log(`  ${ok ? '✅' : '❌'} ${rotulo}`)
  }

  for (const rota of ['/pedidos', '/clientes', '/por-vendedor', '/relatorio', '/equipe', '/configuracoes']) {
    const antes = erros.length
    dom.window.location.hash = `#${rota}`
    await espera(600)
    const texto = (raiz2.textContent ?? '').replace(/\s+/g, ' ')
    const novos = erros.slice(antes)
    const bloqueada = rota === '/relatorio' || rota === '/equipe' || rota === '/configuracoes'
    const ok = texto.length > 200 && !novos.length && (!bloqueada || texto.includes('do proprietário'))
    if (!ok) falhas++
    console.log(`  ${ok ? '✅' : '❌'} ${rota.padEnd(20)} ${bloqueada ? 'bloqueada' : 'liberada'} corretamente`)
  }

  // tela de login (sem sessão)
  dom.window.localStorage.removeItem('altoprints:sessao')
  const raiz3 = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(raiz3)
  const { StoreProvider: SP3 } = await import('../src/lib/store')
  const { AuthProvider: AP3 } = await import('../src/lib/auth')
  createRoot(raiz3 as unknown as Element).render(
    React.createElement(
      HashRouter,
      null,
      React.createElement(SP3, null, React.createElement(AP3, null, React.createElement(App))),
    ),
  )
  await espera(2000)
  const textoLogin = (raiz3.textContent ?? '').replace(/\s+/g, ' ')
  const temLogin = textoLogin.includes('Entrar no sistema') || textoLogin.includes('criar meu acesso')
  if (!temLogin) falhas++
  console.log(`\n  ${temLogin ? '✅' : '❌'} sem sessão, o sistema pede login`)

  console.log(`\n  Problemas encontrados: ${falhas}`)
  if (falhas) process.exit(1)
}

main().catch((e) => {
  erroOriginal('Falha geral no teste de interface:', e)
  process.exit(2)
})
