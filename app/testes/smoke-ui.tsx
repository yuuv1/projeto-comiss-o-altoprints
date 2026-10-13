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
    telas: { relatorio: true, paraImprimir: true, impressoes: true },
    criado_em: new Date().toISOString(),
  }

  // garante um pedido na fila de impressão (para testar o registro da impressão)
  const naFila = banco.pedidos.find((p: { vendedor_id: string }) => p.vendedor_id === vendedor.vendedor_id)
  if (naFila) {
    naFila.status_pagamento = 'pago'
    naFila.impresso = false
    naFila.impresso_em = null
    naFila.status_producao = 'imprimir'
  }

  banco.usuarios = [dono, vendedor]
  dom.window.localStorage.setItem('altoprints:db:v1', JSON.stringify(banco))

  return { banco, dono, vendedor, nomeDoVinculo: banco.vendedores[0].nome, outroVendedor: banco.vendedores[1].nome }
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
  const { dono, vendedor, nomeDoVinculo, outroVendedor } = await prepararAmbiente()
  sessaoDe(dono.id)

  const { createRoot } = await import('react-dom/client')
  const React = await import('react')
  const { StoreProvider } = await import('../src/lib/store')
  const { AuthProvider } = await import('../src/lib/auth')
  const App = (await import('../src/App')).default
  const { HashRouter } = await import('react-router-dom')

  const raiz = dom.window.document.getElementById('root')
  const root1 = createRoot(raiz as unknown as Element)
  root1.render(
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

  /** clica no primeiro botão cujo texto contém o trecho indicado */
  const clicar = (onde: Element | null, trecho: string) => {
    const alvo = [...(onde?.querySelectorAll('button') ?? [])].find((b) =>
      (b.textContent ?? '').includes(trecho),
    )
    alvo?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    return Boolean(alvo)
  }

  /** clica no ÚLTIMO botão com o trecho (usado quando a janela repete o rótulo da página) */
  const clicarUltimo = (onde: Element | null, trecho: string) => {
    const alvos = [...(onde?.querySelectorAll('button') ?? [])].filter((b) =>
      (b.textContent ?? '').includes(trecho),
    )
    const alvo = alvos[alvos.length - 1]
    alvo?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    return Boolean(alvo)
  }

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
    '/impressoes',
    '/entregas',
    '/relatorio',
    '/relatorio-cliente-especial',
    '/equipe',
    '/configuracoes',
    '/pedido/novo',
    `/pedido/${idPedido}`,
    '/rota-inexistente',
  ])

  // a tela de impressões mostra os totais da produção
  dom.window.location.hash = '#/impressoes'
  await espera(700)
  const textoImpressoes = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const impressoesOk =
    textoImpressoes.includes('Metros impressos') &&
    textoImpressoes.includes('% de reimpressão') &&
    textoImpressoes.includes('Metros em reimpressão') &&
    textoImpressoes.includes('Exportar CSV') &&
    textoImpressoes.includes('Quem imprimiu')
  if (!impressoesOk) falhas++
  console.log(`\n  ${impressoesOk ? '✅' : '❌'} tela Impressões mostra totais, filtros e o resumo da produção`)

  // registrar impressão pela fila: abre a janelinha e grava no histórico
  dom.window.location.hash = '#/para-imprimir'
  await espera(700)
  const antesImpressoes = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).impressoes
    .length
  const abriuJanela = clicar(raiz, 'Marcar como impresso')
  await espera(500)
  const textoJanela = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const janelaOk =
    abriuJanela &&
    textoJanela.includes('Registrar impressão — pedido') &&
    textoJanela.includes('Quem imprimiu') &&
    textoJanela.includes('Metros impressos') &&
    textoJanela.includes('Reimpressão')
  if (!janelaOk) falhas++
  console.log(`  ${janelaOk ? '✅' : '❌'} fila abre a janela de registro (metros, quem imprimiu, reimpressão)`)

  const salvouImpressao = clicar(raiz, 'Registrar impressão')
  await espera(700)
  const depoisImpressoes = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).impressoes
    .length
  const gravouImpressao = salvouImpressao && depoisImpressoes === antesImpressoes + 1
  if (!gravouImpressao) falhas++
  console.log(
    `  ${gravouImpressao ? '✅' : '❌'} registrar impressão grava no histórico de produção (${antesImpressoes} → ${depoisImpressoes})`,
  )

  // ---------- catalogar impressão direto pela aba "Impressões" ----------
  dom.window.location.hash = '#/impressoes'
  await espera(700)
  const antesCatalogo = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).impressoes.length
  const abriuCatalogo = clicar(raiz, 'Registrar impressão')
  await espera(500)
  const textoEscolha = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const escolhaOk =
    abriuCatalogo && textoEscolha.includes('escolha o pedido') && textoEscolha.includes('na fila de impressão')
  if (!escolhaOk) falhas++
  console.log(`\n  ${escolhaOk ? '✅' : '❌'} aba Impressões → “Registrar impressão” abre a escolha do pedido`)

  const escolheuPedido = clicar(raiz, 'na fila')
  await espera(500)
  const textoDepoisEscolha = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const formOk =
    escolheuPedido &&
    textoDepoisEscolha.includes('Quem imprimiu') &&
    textoDepoisEscolha.includes('Metros impressos') &&
    textoDepoisEscolha.includes('Trocar pedido')
  if (!formOk) falhas++
  console.log(`  ${formOk ? '✅' : '❌'} escolhido o pedido, a janela pede metros e quem imprimiu`)

  const salvouCatalogo = clicarUltimo(raiz, 'Registrar impressão')
  await espera(700)
  const depoisCatalogo = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).impressoes.length
  const catalogou = salvouCatalogo && depoisCatalogo === antesCatalogo + 1
  if (!catalogou) falhas++
  console.log(
    `  ${catalogou ? '✅' : '❌'} catalogação pela aba grava no histórico (${antesCatalogo} → ${depoisCatalogo})`,
  )

  // ---------- formulário de pedido: essenciais na frente, resto em "Mais opções" ----------
  dom.window.location.hash = '#/pedido/novo'
  await espera(700)
  const textoNovo = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const enxuto =
    textoNovo.includes('Mais opções') &&
    textoNovo.includes('Cliente') &&
    textoNovo.includes('Metragem') &&
    !textoNovo.includes('Data da retirada') &&
    !textoNovo.includes('Retirado por')
  if (!enxuto) falhas++
  console.log(`\n  ${enxuto ? '✅' : '❌'} pedido novo começa enxuto (entrega e datas escondidas)`)

  const abriuExtras = clicar(raiz, 'Mais opções')
  await espera(500)
  const textoExtras = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const extrasOk = abriuExtras && textoExtras.includes('Data da retirada') && textoExtras.includes('Observações')
  if (!extrasOk) falhas++
  console.log(`  ${extrasOk ? '✅' : '❌'} “Mais opções” mostra entrega, datas e observações`)

  // ---------- ver o sistema como funcionário ----------
  dom.window.location.hash = '#/equipe'
  await espera(700)
  const abriuVerComo = clicar(raiz, 'Ver como')
  await espera(800)
  const textoVerComo = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const verComoOk =
    abriuVerComo &&
    textoVerComo.includes('vendo o sistema como') &&
    textoVerComo.includes('Minha área') &&
    textoVerComo.includes('Voltar ao meu acesso')
  if (!verComoOk) falhas++
  console.log(`\n  ${verComoOk ? '✅' : '❌'} “Ver como” abre o sistema com os olhos do funcionário`)

  dom.window.location.hash = '#/configuracoes'
  await espera(600)
  const textoBloqueado = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const bloqueadoNaVisualizacao = textoBloqueado.includes('do proprietário')
  if (!bloqueadoNaVisualizacao) falhas++
  console.log(
    `  ${bloqueadoNaVisualizacao ? '✅' : '❌'} no modo visualização, telas do dono ficam bloqueadas como para o vendedor`,
  )

  // tentar salvar no modo visualização: nada é gravado e a tela avisa
  dom.window.location.hash = '#/vendedores'
  await espera(600)
  const antesVisualizar = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).vendedores.length
  const abriuFormulario = clicar(raiz, 'Novo vendedor')
  await espera(400)
  const campoNome = raiz?.querySelector('form input') as HTMLInputElement | null
  if (campoNome) {
    campoNome.value = 'NAO DEVE SALVAR'
    campoNome.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  }
  await espera(200)
  const formulario = raiz?.querySelector('form') as HTMLFormElement | null
  formulario?.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
  await espera(600)
  const depoisVisualizar = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).vendedores.length
  const textoAviso = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const nadaGravado =
    abriuFormulario && antesVisualizar === depoisVisualizar && textoAviso.includes('só visualização')
  if (!nadaGravado) falhas++
  console.log(
    `\n  ${nadaGravado ? '✅' : '❌'} no modo visualização nada é gravado e a tela avisa (${antesVisualizar} → ${depoisVisualizar} vendedores)`,
  )
  if (!nadaGravado) {
    console.log(
      `     (formulário aberto: ${abriuFormulario} · aviso na tela: ${textoAviso.includes('só visualização')})`,
    )
  }

  dom.window.location.hash = '#/'
  await espera(500)
  const voltou = clicar(raiz, 'Voltar ao meu acesso')
  await espera(700)
  const textoVoltou = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const voltouOk = voltou && textoVoltou.includes('Painel do proprietário')
  if (!voltouOk) falhas++
  console.log(`  ${voltouOk ? '✅' : '❌'} “Voltar ao meu acesso” devolve o painel do proprietário`)

  // ---------- o sistema abre compacto e a aba Aparência troca o tamanho ----------
  const raizHtml = dom.window.document.documentElement
  const abreCompacto = raizHtml.classList.contains('confortavel') === false
  if (!abreCompacto) falhas++
  console.log(`\n  ${abreCompacto ? '✅' : '❌'} o sistema abre no modo compacto (menos espaçamento)`)

  dom.window.location.hash = '#/configuracoes'
  await espera(600)
  const abriuAparencia = clicar(raiz, 'Aparência')
  await espera(400)
  const textoAparencia = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const temAparencia =
    abriuAparencia && textoAparencia.includes('Tema do sistema') && textoAparencia.includes('Tamanho dos blocos')
  if (!temAparencia) falhas++
  console.log(`  ${temAparencia ? '✅' : '❌'} Configurações → Aparência mostra tema e tamanho dos blocos`)

  const clicouConfortavel = clicarUltimo(raiz, 'Confortável')
  await espera(300)
  const virouConfortavel = raizHtml.classList.contains('confortavel')
  if (!virouConfortavel) falhas++
  console.log(`  ${virouConfortavel ? '✅' : '❌'} “Confortável” devolve o espaçamento folgado`)

  const clicouCompacto = clicarUltimo(raiz, 'Compacto')
  await espera(300)
  const deVoltaAoCompacto = raizHtml.classList.contains('confortavel') === false
  if (!(clicouCompacto && deVoltaAoCompacto)) falhas++
  console.log(`  ${clicouCompacto && deVoltaAoCompacto ? '✅' : '❌'} “Compacto” volta a apertar a tela`)

  // confere se o painel do dono realmente mostra o painel
  dom.window.location.hash = '#/'
  await espera(600)
  const painel = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const temPainel = painel.includes('Painel do proprietário')
  if (!temPainel) falhas++
  console.log(`  ${temPainel ? '✅' : '❌'} início do proprietário mostra o painel geral`)

  // a tela Equipe precisa abrir a janela de criar conta (por ela o dono registra a equipe)
  dom.window.location.hash = '#/equipe'
  await espera(700)
  const abriuNovaConta = clicar(raiz, 'Nova conta')
  await espera(500)
  const textoNovaConta = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const novaContaOk =
    abriuNovaConta &&
    textoNovaConta.includes('Nova conta de acesso') &&
    textoNovaConta.includes('Já trabalha aqui?') &&
    textoNovaConta.includes('criar vendedor novo com este nome')
  if (!novaContaOk) falhas++
  console.log(`\n  ${novaContaOk ? '✅' : '❌'} Equipe abre a janela “Nova conta” com o vínculo e o histórico`)

  // a aba "Meu acesso" das configurações (só o proprietário) precisa abrir
  dom.window.location.hash = '#/configuracoes'
  await espera(700)
  const abriuAcesso = clicar(raiz, 'Meu acesso')
  await espera(400)
  const textoAcesso = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const acessoOk =
    abriuAcesso && textoAcesso.includes('Trocar a minha senha') && textoAcesso.includes('Meu nome de usuário')
  if (!acessoOk) falhas++
  console.log(`  ${acessoOk ? '✅' : '❌'} Configurações → “Meu acesso” abre a troca de usuário e senha do dono`)

  // a aba Nuvem mostra o assistente de conexão (3 passos) quando está no modo local
  await clicar(raiz, 'Nuvem')
  await espera(400)
  const textoNuvem = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const nuvemOk =
    textoNuvem.includes('Para que serve conectar a nuvem') &&
    textoNuvem.includes('Copiar o SQL') &&
    textoNuvem.includes('Conectar à nuvem') &&
    textoNuvem.includes('Já tenho um código de conexão') &&
    textoNuvem.includes('cole tudo aqui e o sistema separa') &&
    textoNuvem.includes('Prefere que alguém faça isso para você')
  if (!nuvemOk) falhas++
  console.log(`  ${nuvemOk ? '✅' : '❌'} Configurações → Nuvem mostra o assistente de conexão em 3 passos`)
  if (!nuvemOk) console.log('     TEXTO:', textoNuvem.slice(0, 200))

  // a tabela oficial de comissão aparece na aba de comissões
  await clicar(raiz, 'Comissões')
  await espera(400)
  const textoComissoes = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const tabelaOk =
    textoComissoes.includes('1 a 5 m') &&
    textoComissoes.includes('50 a 100 m') &&
    textoComissoes.includes('acima de 100 m') &&
    textoComissoes.includes('Usar tabela oficial')
  if (!tabelaOk) falhas++
  console.log(`  ${tabelaOk ? '✅' : '❌'} comissões mostram a tabela oficial e o botão de restaurar`)

  // agora entra como vendedor
  sessaoDe(vendedor.id)
  dom.window.location.reload?.()
  const { StoreProvider: SP2 } = await import('../src/lib/store')
  const { AuthProvider: AP2 } = await import('../src/lib/auth')
  const raiz2 = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(raiz2)
  const root2 = createRoot(raiz2 as unknown as Element)
  root2.render(
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
    ['vendedor não vê Equipe nem Configurações no menu', !textoVendedor.includes('Configurações')],
  ]
  console.log('\n  Vendedor (vê só o dele)')
  for (const [rotulo, ok] of checagens) {
    if (!ok) falhas++
    console.log(`  ${ok ? '✅' : '❌'} ${rotulo}`)
  }

  const rotasVendedor: { rota: string; esperado: 'liberada' | 'proprietario' | 'nao-liberada' }[] = [
    { rota: '/pedidos', esperado: 'liberada' },
    { rota: '/clientes', esperado: 'liberada' },
    { rota: '/por-vendedor', esperado: 'liberada' },
    { rota: '/relatorio', esperado: 'liberada' },
    { rota: '/para-imprimir', esperado: 'liberada' },
    { rota: '/impressoes', esperado: 'liberada' },
    { rota: '/entregas', esperado: 'nao-liberada' },
    { rota: '/equipe', esperado: 'proprietario' },
    { rota: '/configuracoes', esperado: 'proprietario' },
  ]
  for (const { rota, esperado } of rotasVendedor) {
    const antes = erros.length
    dom.window.location.hash = `#${rota}`
    await espera(600)
    const texto = (raiz2.textContent ?? '').replace(/\s+/g, ' ')
    const novos = erros.slice(antes)
    const ok =
      texto.length > 200 &&
      !novos.length &&
      (esperado === 'liberada' ||
        (esperado === 'proprietario' && texto.includes('do proprietário')) ||
        (esperado === 'nao-liberada' && texto.includes('não está liberada')))
    if (!ok) falhas++
    console.log(
      `  ${ok ? '✅' : '❌'} ${rota.padEnd(28)} ${
        esperado === 'liberada'
          ? 'liberada'
          : esperado === 'proprietario'
            ? 'só do proprietário'
            : 'bloqueada (não liberada)'
      }`,
    )
    if (!ok) console.log('     TEXTO:', texto.slice(0, 160))
  }

  // o relatório do vendedor só mostra os pedidos dele (sem citar o outro vendedor)
  dom.window.location.hash = '#/relatorio'
  await espera(700)
  const textoRelatorioVendedor = (raiz2.textContent ?? '').replace(/\s+/g, ' ')
  const relatorioSoDele =
    textoRelatorioVendedor.includes(nomeDoVinculo) && !textoRelatorioVendedor.includes(outroVendedor)
  if (!relatorioSoDele) falhas++
  console.log(`  ${relatorioSoDele ? '✅' : '❌'} relatório do vendedor mostra só os dados de ${nomeDoVinculo}`)

  // a tela de impressão liberada não mostra valores em dinheiro
  dom.window.location.hash = '#/para-imprimir'
  await espera(700)
  const textoImpressao = (raiz2.textContent ?? '').replace(/\s+/g, ' ')
  const semDinheiro = !textoImpressao.includes('Valor na fila') && !textoImpressao.includes('R$')
  if (!semDinheiro) falhas++
  console.log(`  ${semDinheiro ? '✅' : '❌'} fila de impressão liberada para o vendedor, sem valores em dinheiro`)

  // o histórico de impressões também abre para quem produz, sem valores em dinheiro
  dom.window.location.hash = '#/impressoes'
  await espera(700)
  const textoImpressoesVendedor = (raiz2.textContent ?? '').replace(/\s+/g, ' ')
  const impressoesSemDinheiro =
    textoImpressoesVendedor.includes('Metros impressos') && !textoImpressoesVendedor.includes('R$')
  if (!impressoesSemDinheiro) falhas++
  console.log(`  ${impressoesSemDinheiro ? '✅' : '❌'} histórico de impressões liberado para quem produz, sem valores`)

  // tela de login (sem sessão)
  dom.window.localStorage.removeItem('altoprints:sessao')
  const raiz3 = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(raiz3)
  const { StoreProvider: SP3 } = await import('../src/lib/store')
  const { AuthProvider: AP3 } = await import('../src/lib/auth')
  const root3 = createRoot(raiz3 as unknown as Element)
  root3.render(
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

  // a tela comum não pode revelar a porta do proprietário
  const naoRevelaPorta =
    !textoLogin.toLowerCase().includes('proprietário') &&
    !textoLogin.toLowerCase().includes('proprietario') &&
    !(raiz3.innerHTML ?? '').includes('/administracao')
  if (!naoRevelaPorta) falhas++
  console.log(`  ${naoRevelaPorta ? '✅' : '❌'} tela comum não menciona nem aponta para a administração`)

  // a versão aparece na tela de login (é como conferimos se o aparelho está atualizado)
  const { VERSAO } = await import('../src/lib/versao')
  const mostraVersao = textoLogin.includes(`versão ${VERSAO}`)
  if (!mostraVersao) falhas++
  console.log(`  ${mostraVersao ? '✅' : '❌'} tela de login mostra a versão ${VERSAO}`)

  // os exemplos de nome de pessoa saíram dos campos de login
  const semExemplosDeNome = !raiz3.innerHTML.includes('ex.: jessica') && !raiz3.innerHTML.includes('Ex.: JESSICA')
  if (!semExemplosDeNome) falhas++
  console.log(`  ${semExemplosDeNome ? '✅' : '❌'} campos de login sem os exemplos com nome de pessoa`)

  // porta administrativa com um dono já existente: pede o login do dono
  // (desmonta as telas anteriores: elas continuariam reagindo ao endereço e mudariam a rota)
  root1.unmount()
  root2.unmount()
  root3.unmount()
  await espera(150)
  const raiz4 = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(raiz4)
  const { StoreProvider: SP4 } = await import('../src/lib/store')
  const { AuthProvider: AP4 } = await import('../src/lib/auth')
  dom.window.location.hash = '#/administracao'
  await espera(120)
  const root4 = createRoot(raiz4 as unknown as Element)
  root4.render(
    React.createElement(
      HashRouter,
      null,
      React.createElement(SP4, null, React.createElement(AP4, null, React.createElement(App))),
    ),
  )
  await espera(2000)
  const textoPorta = (raiz4.textContent ?? '').replace(/\s+/g, ' ')
  const portaOk =
    textoPorta.includes('Administração') &&
    textoPorta.includes('Entrar como administrador') &&
    // quem descobrir a porta não encontra lista de nomes nem cadastro na tela
    !textoPorta.includes('Criar meu acesso') &&
    !textoPorta.includes('RAISSA') &&
    !textoPorta.includes('Faturamento')
  if (!portaOk) falhas++
  console.log(`  ${portaOk ? '✅' : '❌'} porta administrativa pede o login do proprietário (sem dados na tela)`)
  if (!portaOk) console.log('     TEXTO:', textoPorta.slice(0, 220))

  // sem nenhum dono cadastrado, a porta oferece criar o primeiro acesso
  const bancoSemDono = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  bancoSemDono.usuarios = []
  dom.window.localStorage.setItem('altoprints:db:v1', JSON.stringify(bancoSemDono))
  dom.window.localStorage.removeItem('altoprints:sessao')
  root4.unmount()
  await espera(150)
  const raiz5 = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(raiz5)
  const { StoreProvider: SP5 } = await import('../src/lib/store')
  const { AuthProvider: AP5 } = await import('../src/lib/auth')
  dom.window.location.hash = '#/administracao'
  await espera(120)
  const root5 = createRoot(raiz5 as unknown as Element)
  root5.render(
    React.createElement(
      HashRouter,
      null,
      React.createElement(SP5, null, React.createElement(AP5, null, React.createElement(App))),
    ),
  )
  await espera(2000)
  const textoCriar = (raiz5.textContent ?? '').replace(/\s+/g, ' ')
  const criarOk = textoCriar.includes('Criar acesso do proprietário') && textoCriar.includes('Acesso restrito')
  if (!criarOk) falhas++
  console.log(`  ${criarOk ? '✅' : '❌'} sem dono cadastrado, a porta cria o primeiro acesso do proprietário`)
  if (!criarOk) console.log('     TEXTO:', textoCriar.slice(0, 220))

  // 5 toques no logo (na tela de login) abrem a porta administrativa
  root5.unmount()
  await espera(150)
  dom.window.localStorage.removeItem('altoprints:sessao')
  dom.window.location.hash = '#/login'
  await espera(120)
  const raiz6 = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(raiz6)
  const { StoreProvider: SP6 } = await import('../src/lib/store')
  const { AuthProvider: AP6 } = await import('../src/lib/auth')
  createRoot(raiz6 as unknown as Element).render(
    React.createElement(
      HashRouter,
      null,
      React.createElement(SP6, null, React.createElement(AP6, null, React.createElement(App))),
    ),
  )
  await espera(2000)
  const logoTap = [...raiz6.querySelectorAll('button')].find((b) => (b.title ?? '') === 'Altoprints')
  for (let i = 0; i < 5; i++) {
    logoTap?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    await espera(60)
  }
  await espera(800)
  const textoToques = (raiz6.textContent ?? '').replace(/\s+/g, ' ')
  const toquesOk = textoToques.includes('Criar acesso do proprietário') || textoToques.includes('Administração')
  if (!toquesOk) falhas++
  console.log(`  ${toquesOk ? '✅' : '❌'} 5 toques no logo abrem a porta do proprietário`)
  if (!toquesOk) console.log('     TEXTO:', textoToques.slice(0, 200))

  console.log(`\n  Problemas encontrados: ${falhas}`)
  if (falhas) process.exit(1)
}

main().catch((e) => {
  erroOriginal('Falha geral no teste de interface:', e)
  process.exit(2)
})
