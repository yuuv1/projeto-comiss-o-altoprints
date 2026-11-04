/**
 * Teste de fumaça da interface: abre o sistema num DOM simulado (jsdom),
 * entra com uma conta de proprietário e navega por TODAS as telas,
 * depois repete com uma conta de vendedor conferindo o que ele vê.
 *
 * Rode com:  npm run testar
 */
import { JSDOM } from 'jsdom'
import { hojeISO } from '../src/lib/format'

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
  // O teste do relatório precisa de pelo menos uma fila concluída de cada
  // funcionário no período corrente (a demonstração pode atravessar um mês).
  const concluidasParaRelatorio = banco.pedidos.filter((p) => p.estagio === 'concluido').slice(0, banco.vendedores.length)
  concluidasParaRelatorio.forEach((pedido, indice) => {
    pedido.vendedor_id = banco.vendedores[indice].id
    pedido.data_pedido = new Date().toISOString()
    pedido.data_pagamento = pedido.data_pedido
    pedido.pago = true
  })
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
  // garante uma fila do vendedor esperando na máquina (para testar os passos no cartão)
  const naFila = banco.pedidos.find(
    (p: { vendedor_id: string; estagio: string; iniciado_em: string | null }) =>
      p.vendedor_id === banco.vendedores[0].id && p.estagio === 'em_andamento' && !p.iniciado_em,
  )
  if (naFila) {
    naFila.pago = false
    naFila.data_pagamento = null
    naFila.entregue = false
  }

  banco.usuarios = [dono]
  dom.window.localStorage.setItem('altoprints:db:v1', JSON.stringify(banco))

  return { banco, dono, nomeDoVinculo: banco.vendedores[0].nome, outroVendedor: banco.vendedores[1].nome }
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
  const { banco, dono, nomeDoVinculo, outroVendedor } = await prepararAmbiente()
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

  const bancoAtual = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  const idPedido = bancoAtual.pedidos.find(
    (p: { vendedor_id: string }) => p.vendedor_id === banco.vendedores[0].id,
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
    '/relatorio',
    '/relatorio-cliente-especial',
    '/equipe',
    '/configuracoes',
    '/pedido/novo',
    `/pedido/${idPedido}`,
    '/rota-inexistente',
  ])

  // ---------- Pedidos: filtros do catálogo (Todas, DTF Têxtil, DTF UV, Entregues) e selo de entrega ----------
  dom.window.location.hash = '#/pedidos'
  await espera(800)
  const textoPedidos = (raiz?.textContent ?? '').replace(/\s+/g, ' ')

  const filtrosFilaOk = ['Todas', 'DTF Têxtil', 'DTF UV', 'Entregues'].every((f) =>
    textoPedidos.includes(f),
  )
  const filtrosVelhosFora = ['A pagar', 'A imprimir', 'Imprimindo'].every((f) => !textoPedidos.includes(f))
  if (!filtrosFilaOk || !filtrosVelhosFora) falhas++
  console.log(
    `\n  ${filtrosFilaOk && filtrosVelhosFora ? '✅' : '❌'} Pedidos traz os filtros do catálogo (Todas, DTF Têxtil, DTF UV, Entregues) sem “A pagar”`,
  )

  const botoesDaTela = () => [...(raiz?.querySelectorAll('button') ?? [])]
  /** acha o selo que ainda NÃO foi marcado (quando marcado, o título ganha “clicar desfaz”) */
  const acharPasso = (titulo: string) => botoesDaTela().find((b) => (b.getAttribute('title') ?? '') === titulo)

  const lerPedidos = (): { estagio: string; pago: boolean; entregue: boolean }[] =>
    JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).pedidos

  // entregue é uma marcação opcional no cartão
  const antesEntregues = lerPedidos().filter((p) => p.entregue).length
  const botaoEntregar = acharPasso('Marcar como entregue ao cliente')
  botaoEntregar?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await espera(900)
  const depoisEntregues = lerPedidos().filter((p) => p.entregue).length
  const entregouOk = Boolean(botaoEntregar) && depoisEntregues === antesEntregues + 1
  if (!entregouOk) falhas++
  console.log(`  ${entregouOk ? '✅' : '❌'} “entregue” marca a entrega no cartão (${antesEntregues} → ${depoisEntregues})`)

  // ---------- formulário de pedido: Tipo de DTF obrigatório na frente, resto em "Mais opções" ----------
  dom.window.location.hash = '#/pedido/novo'
  await espera(700)
  const textoNovo = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const enxuto =
    textoNovo.includes('Mais opções') &&
    textoNovo.includes('Cliente') &&
    textoNovo.includes('Tipo de DTF') &&
    textoNovo.includes('DTF Têxtil') &&
    textoNovo.includes('DTF UV') &&
    textoNovo.includes('Metragem') &&
    !textoNovo.includes('Ainda não pago') &&
    !textoNovo.includes('Data da retirada') &&
    !textoNovo.includes('Retirado por')
  if (!enxuto) falhas++
  console.log(`\n  ${enxuto ? '✅' : '❌'} pedido novo exige Tipo de DTF (DTF Têxtil / DTF UV) e começa enxuto`)

  const abriuExtras = clicar(raiz, 'Mais opções')
  await espera(500)
  const textoExtras = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const extrasOk = abriuExtras && textoExtras.includes('Data da retirada') && textoExtras.includes('Observações')
  if (!extrasOk) falhas++
  console.log(`  ${extrasOk ? '✅' : '❌'} “Mais opções” mostra entrega, datas e observações`)

  // ---------- só o proprietário cadastra/exclui funcionário ----------
  dom.window.location.hash = '#/equipe'
  await espera(800)
  const antesEquipe = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).vendedores.length
  // excluir quem já tem pedidos é bloqueado (o histórico/comissão não pode se perder)
  const clicouExcluir = clicar(raiz, 'Excluir')
  await espera(700)
  const textoExcluir = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const depoisEquipe = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).vendedores.length
  const protegidoOk =
    clicouExcluir &&
    antesEquipe === depoisEquipe &&
    textoExcluir.includes('pedido(s) no histórico') &&
    textoExcluir.includes('renomeie em vez de excluir')
  if (!protegidoOk) falhas++
  console.log(
    `\n  ${protegidoOk ? '✅' : '❌'} funcionário com pedidos no histórico não é excluído (${antesEquipe} → ${depoisEquipe})`,
  )

  // cadastrar um funcionário novo acrescenta um nome na lista (sem criar conta/senha)
  const campoNovoFuncionario = dom.window.document.querySelector('#novo-funcionario') as HTMLInputElement | null
  if (campoNovoFuncionario) {
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(campoNovoFuncionario, 'FUNCIONARIO NOVO')
    campoNovoFuncionario.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  }
  const clicouCadastrar = clicar(raiz, 'Cadastrar')
  await espera(900)
  const bancoDepois = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  const criouFuncionario =
    Boolean(campoNovoFuncionario) &&
    clicouCadastrar &&
    bancoDepois.vendedores.some((v: { nome: string }) => v.nome === 'FUNCIONARIO NOVO') &&
    bancoDepois.usuarios.length === 1
  if (!criouFuncionario) falhas++
  console.log(
    `  ${criouFuncionario ? '✅' : '❌'} o dono cadastra funcionário novo sem criar conta de acesso (${bancoDepois.vendedores.length} nomes · ${bancoDepois.usuarios.length} login)`,
  )

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

  // ---------- instalação PWA ----------
  const botaoInstalar = raiz?.querySelector<HTMLButtonElement>('button[aria-label="Instalar Altoprints como aplicativo"]')
  if (!botaoInstalar) falhas++
  console.log(`  ${botaoInstalar ? '✅' : '❌'} botão para instalar o Altoprints como aplicativo está disponível`)
  botaoInstalar?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await espera(120)
  const ajudaInstalacao = raiz?.querySelector('[role="dialog"][aria-labelledby="titulo-instalar-app"]')
  const instrucoesInstalacao = (ajudaInstalacao?.textContent ?? '').includes('Adicionar Altoprints à tela inicial')
  if (!instrucoesInstalacao) falhas++
  console.log(`  ${instrucoesInstalacao ? '✅' : '❌'} navegadores sem prompt mostram instruções para adicionar à tela inicial`)
  ajudaInstalacao?.querySelector<HTMLButtonElement>('button[aria-label="Fechar instruções de instalação"]')?.click()
  await espera(60)

  // ---------- marca e barra de cima ----------
  dom.window.location.hash = '#/'
  await espera(700)
  const simboloDaMarca = raiz?.querySelector<HTMLImageElement>('header img[src="./icons/pwa-192x192.png"]')
  const marcaNovaOk = simboloDaMarca?.getAttribute('alt') === ''
  if (!marcaNovaOk) falhas++
  console.log(`\n  ${marcaNovaOk ? '✅' : '❌'} cabeçalho mostra o símbolo colorido da nova marca`)

  // ---------- barra de cima: só os 4 atalhos do dia a dia ----------
  const navTopo = raiz?.querySelector('header nav') ?? null
  const textoNav = (navTopo?.textContent ?? '').replace(/\s+/g, ' ')
  const barraEnxuta =
    textoNav.includes('Pedidos') &&
    textoNav.includes('Clientes') &&
    textoNav.includes('Relatório') &&
    !textoNav.includes('Para imprimir') &&
    !textoNav.includes('Configurações') &&
    !textoNav.includes('Entregas') &&
    !textoNav.includes('Impressões') &&
    !textoNav.includes('Vendedores') &&
    !textoNav.includes('Mais')
  if (!barraEnxuta) falhas++
  console.log(`\n  ${barraEnxuta ? '✅' : '❌'} barra de cima só com os 4 atalhos do dia a dia`)

  const engrenagem = [...(raiz?.querySelectorAll('header a') ?? [])].find((a) =>
    (a.getAttribute('href') ?? '').includes('/configuracoes'),
  )
  if (!engrenagem) falhas++
  console.log(`  ${engrenagem ? '✅' : '❌'} engrenagem no canto leva a Configurações (Equipe e Vendedores lá dentro)`)

  // ---------- relatório: uma tela só, sem comissão por faixa de metragem ----------
  dom.window.location.hash = '#/relatorio'
  await espera(900)
  // o relatório começa no filtro diário ("Hoje (Diário)"); ao clicar em "Este mês" confere as concluídas do mês
  clicar(raiz, 'Este mês')
  await espera(400)
  const textoRel = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const relatorioOk =
    textoRel.includes('Resumo por vendedor') &&
    !textoRel.includes('Comissão por faixa de metragem') &&
    textoRel.includes('Tipo DTF')
  if (!relatorioOk) falhas++
  console.log(`\n  ${relatorioOk ? '✅' : '❌'} Relatório traz o resumo por vendedor, coluna Tipo DTF e remove comissão por faixa`)

  // o relatório do período (este mês) só pode contar as filas CONCLUÍDAS
  const pedidosNoBanco = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).pedidos as {
    estagio: string
    data_pedido: string
  }[]
  const mesAtual = new Date().toISOString().slice(0, 7)
  const diaDoMes = (p: { data_pedido: string }) => (p.data_pedido || '').slice(0, 10)
  const noMesAtual = (p: { data_pedido: string }) => diaDoMes(p) >= `${mesAtual}-01` && diaDoMes(p) <= hojeISO()
  const concluidasDoMes = pedidosNoBanco.filter((p) => p.estagio === 'concluido' && noMesAtual(p)).length
  const emAndamentoDoMes = pedidosNoBanco.filter((p) => p.estagio !== 'concluido' && noMesAtual(p)).length
  // no HTML o rótulo e o número ficam colados: "Filas concluídas13"
  const contagemDoRelatorio = Number(textoRel.match(/Filas concluídas\s*(\d+)/)?.[1] ?? -1)
  const soConcluidasNoRelatorio = emAndamentoDoMes > 0 && contagemDoRelatorio === concluidasDoMes
  if (!soConcluidasNoRelatorio) falhas++
  console.log(
    `  ${soConcluidasNoRelatorio ? '✅' : '❌'} o relatório conta só as filas concluídas (${concluidasDoMes} concluídas · ${emAndamentoDoMes} em andamento fora da conta · relatório mostrou ${contagemDoRelatorio})`,
  )

  const semTelaDeImpressoes = !textoRel.includes('Filas registradas') && !textoRel.includes('Quem imprimiu')
  if (!semTelaDeImpressoes) falhas++
  console.log(
    `  ${semTelaDeImpressoes ? '✅' : '❌'} a tela de impressões saiu do sistema (o status muda pela tela Pedidos)`,
  )

  // ---------- comissões no relatório impresso (A4) ----------
  const areaImpressa = raiz?.querySelector('.print-area')
  const textoImpresso = (areaImpressa?.textContent ?? '').replace(/\s+/g, ' ')
  const tabelasImpressas = Array.from(areaImpressa?.querySelectorAll('table') ?? [])
  const tabelaEquipeImpressa = tabelasImpressas[0]
  const celulasRodapeEquipe = Array.from(tabelaEquipeImpressa?.querySelectorAll('tfoot td') ?? []).map((td) =>
    (td.textContent ?? '').trim(),
  )
  const impressoComComissoes =
    textoImpresso.includes('Comissões da equipe') &&
    !textoImpresso.includes('Comissão por faixa de metragem') &&
    celulasRodapeEquipe.length === 5 &&
    celulasRodapeEquipe[0] === 'TOTAL' &&
    textoImpresso.includes(nomeDoVinculo) &&
    textoImpresso.includes(outroVendedor)
  if (!impressoComComissoes) falhas++
  console.log(
    `\n  ${impressoComComissoes ? '✅' : '❌'} relatório impresso traz totais abaixo de cada coluna da equipe e remove comissão por faixa`,
  )

  const tabelaDetalhamento = tabelasImpressas[tabelasImpressas.length - 1]
  const cabecalhosDetalhamento = Array.from(tabelaDetalhamento?.querySelectorAll('thead th') ?? []).map((th) =>
    (th.textContent ?? '').trim(),
  )
  const linhasDetalhamento = Array.from(tabelaDetalhamento?.querySelectorAll('tbody tr') ?? [])
  const detalheDoPedidoOk =
    cabecalhosDetalhamento.join('|') === 'Tipo DTF|Cliente|Vendedor|Metragem|Valor|Comissão|Data' &&
    linhasDetalhamento.length > 0 &&
    linhasDetalhamento.every(
      (linha) =>
        (linha.cells[0]?.textContent?.includes('DTF Têxtil') || linha.cells[0]?.textContent?.includes('DTF UV')) &&
        linha.cells[5]?.textContent?.includes('R$'),
    ) &&
    !tabelaDetalhamento?.querySelector('tfoot') &&
    !textoImpresso.includes('TOTAL GERAL')
  if (!detalheDoPedidoOk) falhas++
  console.log(
    `  ${detalheDoPedidoOk ? '✅' : '❌'} detalhamento impresso troca Nº por Tipo DTF e Pagamento pela Data de registro`,
  )

  dom.window.location.hash = '#/clientes'
  await espera(700)
  const clicouEspeciais = clicar(raiz, '★ Especiais')
  await espera(600)
  const textoEspeciais = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const especiaisOk =
    clicouEspeciais && (textoEspeciais.includes('Total pago') || textoEspeciais.includes('Nenhum cliente especial'))
  if (!especiaisOk) falhas++
  console.log(`  ${especiaisOk ? '✅' : '❌'} o cliente especial virou uma aba dentro de Clientes`)

  dom.window.location.hash = '#/pedidos'
  await espera(800)
  const textoEntregaFila = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const entregaNaFilaOk =
    textoEntregaFila.includes('Entregues') &&
    (textoEntregaFila.includes('Retirada') || textoEntregaFila.includes('Correios'))
  if (!entregaNaFilaOk) falhas++
  console.log(
    `  ${entregaNaFilaOk ? '✅' : '❌'} a entrega virou uma etapa da fila (filtro “Entregues” + retirada/correios no cartão)`,
  )

  dom.window.location.hash = '#/configuracoes'
  await espera(700)
  const clicouEquipe = clicar(raiz, 'Funcionários e acessos')
  await espera(600)
  const textoEquipeAba = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const equipeOk =
    clicouEquipe &&
    textoEquipeAba.includes('Funcionários') &&
    textoEquipeAba.includes('Acessos de proprietário') &&
    textoEquipeAba.includes('Novo funcionário')
  if (!equipeOk) falhas++
  console.log(`  ${equipeOk ? '✅' : '❌'} “Funcionários e acessos” é uma aba dentro de Configurações`)

  dom.window.location.hash = '#/configuracoes?aba=dados'
  await espera(600)
  const campoMesclarCSV = raiz?.querySelector<HTMLInputElement>('input[type="file"][accept=".csv,text/csv"]')
  const textoBackupCSV = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const mesclaCSVVisivel = Boolean(campoMesclarCSV) && textoBackupCSV.includes('Mesclar relatório CSV')
  if (!mesclaCSVVisivel) falhas++
  console.log(`  ${mesclaCSVVisivel ? '✅' : '❌'} Configurações → Dados oferece mesclagem segura do relatório CSV`)

  // confere se o painel do dono realmente mostra o painel
  dom.window.location.hash = '#/'
  await espera(600)
  const painel = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const temPainel = painel.includes('Painel do proprietário')
  if (!temPainel) falhas++
  console.log(`  ${temPainel ? '✅' : '❌'} início do proprietário mostra o painel geral`)

  // os dados de exemplo avisam na tela que não são reais (ninguém confunde treino
  // com produção) e oferecem o atalho para apagar tudo
  const avisoExemplo = painel.includes('não são reais') && painel.includes('Apagar dados de exemplo')
  if (!avisoExemplo) falhas++
  console.log(`  ${avisoExemplo ? '✅' : '❌'} dados de exemplo avisam que "não são reais" e trazem o atalho para apagar`)

  // ---------- painel do chefe: resumo por filtro no topo (sem bloco redundante "Resumo de hoje") ----------
  const resumoHojeRemovidoOk =
    !painel.includes('Resumo de hoje') &&
    painel.includes('Resumo por filtro:') &&
    painel.includes('Hoje (Diário)') &&
    painel.includes('Pedidos pagos') &&
    painel.includes('Faturamento')
  if (!resumoHojeRemovidoOk) falhas++
  console.log(
    `  ${resumoHojeRemovidoOk ? '✅' : '❌'} painel remove o “Resumo de hoje” e destaca primeiro o resumo por filtro (começando no diário)`,
  )

  const atalhosGrandesOk = ['Novo pedido', 'DTF Têxtil', 'DTF UV', 'Equipe', 'Relatório'].every((t) =>
    painel.includes(t),
  )
  if (!atalhosGrandesOk) falhas++
  console.log(`  ${atalhosGrandesOk ? '✅' : '❌'} painel tem os 5 atalhos grandes do dia a dia`)

  const checklistRemovidoOk = !painel.includes('Primeiros passos')
  if (!checklistRemovidoOk) falhas++
  console.log(`  ${checklistRemovidoOk ? '✅' : '❌'} bloco "Primeiros passos" foi removido do painel do proprietário`)

  const equipeTabelaOk = painel.includes('Funcionários · mês atual') && painel.includes('Última venda')
  if (!equipeTabelaOk) falhas++
  console.log(`  ${equipeTabelaOk ? '✅' : '❌'} funcionários aparecem em tabela (pedidos, faturamento, comissão, última venda)`)

  // ---------- busca rápida (Ctrl + K) ----------
  dom.window.location.hash = '#/'
  await espera(600)
  dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
  await espera(400)
  const dialogoBusca = raiz?.querySelector('[role="dialog"][aria-label="Busca rápida"]') ?? null
  if (!dialogoBusca) falhas++
  console.log(`  ${dialogoBusca ? '✅' : '❌'} Ctrl + K abre a busca rápida de qualquer tela`)

  const campoBusca = dialogoBusca?.querySelector('input') as HTMLInputElement | null
  if (campoBusca) {
    // o React guarda o último valor do campo: escrever pelo setter nativo é o que
    // faz o evento "input" chegar mesmo no onChange (como um dedo digitando)
    const setterNativo = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')?.set
    setterNativo?.call(campoBusca, 'cliente exemplo 03')
    campoBusca.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  }
  await espera(500)
  const textoBusca = (dialogoBusca?.textContent ?? '').replace(/\s+/g, ' ')
  const achouPelaBusca = textoBusca.includes('CLIENTE EXEMPLO 03')
  if (!achouPelaBusca) falhas++
  console.log(`  ${achouPelaBusca ? '✅' : '❌'} a busca acha o cliente pelo nome (${textoBusca.slice(0, 60)}…)`)

  // o resultado do cliente mostra o vendedor dele no subtítulo ("vendedor: ...")
  const resultadoDoCliente = [...(dialogoBusca?.querySelectorAll('ul li button') ?? [])].find((b) =>
    (b.textContent ?? '').includes('vendedor:'),
  ) as HTMLElement | undefined
  resultadoDoCliente?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await espera(600)
  const foiParaOCliente = dom.window.location.hash.startsWith('#/clientes')
  if (!foiParaOCliente) falhas++
  console.log(`  ${foiParaOCliente ? '✅' : '❌'} clicar no resultado leva direto para o cliente (${dom.window.location.hash})`)

  // ---------- chegar em Pedidos filtrado por vendedor ----------
  dom.window.location.hash = `#/pedidos?vendedor=${banco.vendedores[0].id}`
  await espera(700)
  const textoFiltroVendedor = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const filtroVendedorOk =
    textoFiltroVendedor.includes('Mostrando só os pedidos de') && textoFiltroVendedor.includes(nomeDoVinculo)
  if (!filtroVendedorOk) falhas++
  console.log(
    `  ${filtroVendedorOk ? '✅' : '❌'} Pedidos aceita ?vendedor= e avisa de quem está mostrando os pedidos`,
  )

  // a tela do proprietário cadastra FUNCIONÁRIOS (sem conta) e outros acessos de dono
  dom.window.location.hash = '#/equipe'
  await espera(800)
  const textoEquipe = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const funcionariosOk =
    textoEquipe.includes('Funcionários e acessos') &&
    textoEquipe.includes(nomeDoVinculo) &&
    textoEquipe.includes(outroVendedor) &&
    textoEquipe.includes('Novo funcionário') &&
    textoEquipe.includes('Acessos de proprietário') &&
    textoEquipe.includes('Renomear')
  if (!funcionariosOk) falhas++
  console.log(`\n  ${funcionariosOk ? '✅' : '❌'} a tela lista os funcionários (sem conta/senha) e os acessos de dono`)
  if (!funcionariosOk) console.log('     TEXTO:', textoEquipe.slice(0, 260))

  const abriuNovoAcesso = clicar(raiz, 'Novo acesso')
  await espera(600)
  const textoNovoAcesso = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const novoDonoOk =
    abriuNovoAcesso &&
    textoNovoAcesso.includes('Novo acesso de proprietário') &&
    (textoNovoAcesso.includes('E-mail ou usuário (login)') || textoNovoAcesso.includes('Usuário (login)')) &&
    textoNovoAcesso.includes('Repita a senha')
  if (!novoDonoOk) falhas++
  console.log(`  ${novoDonoOk ? '✅' : '❌'} a janela “Novo acesso” cria outro proprietário com usuário e senha`)
  if (!novoDonoOk) console.log('     TEXTO:', textoNovoAcesso.slice(0, 260))

  // a aba "Meu acesso" das configurações (só do proprietário) precisa abrir
  dom.window.location.hash = '#/configuracoes'
  await espera(800)
  const abriuAcesso = clicar(raiz, 'Meu acesso')
  await espera(400)
  const textoAcesso = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const acessoOk =
    abriuAcesso &&
    textoAcesso.includes('Trocar a minha senha') &&
    textoAcesso.includes('Outro acesso de proprietário') &&
    textoAcesso.includes('Abrir Funcionários e acessos')
  if (!acessoOk) falhas++
  console.log(`  ${acessoOk ? '✅' : '❌'} Configurações → “Meu acesso” troca a senha do dono e aponta outro proprietário`)
  if (!acessoOk) console.log('     TEXTO:', textoAcesso.slice(0, 260))

  // em desenvolvimento sem conexão, a aba Nuvem mostra o assistente de teste (3 passos)
  await clicar(raiz, 'Nuvem')
  await espera(400)
  const textoNuvem = (raiz?.textContent ?? '').replace(/\s+/g, ' ')
  const nuvemOk =
    textoNuvem.includes('Ambiente de desenvolvimento sem Supabase') &&
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

  // ---------- equipe sem login: o sistema abre direto, sem pedir senha ----------
  dom.window.localStorage.removeItem('altoprints:sessao')
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
  await espera(900)
  const textoEquipeSemLogin = (raiz2.textContent ?? '').replace(/\s+/g, ' ')

  const checagens: [string, boolean][] = [
    [
      'sem login o sistema já abre no dia a dia (Pedidos)',
      textoEquipeSemLogin.includes('Pedidos') && !textoEquipeSemLogin.includes('Entrar no sistema'),
    ],
    ['a equipe vê “Login proprietário” no topo', textoEquipeSemLogin.includes('Login proprietário')],
    ['a equipe NÃO vê o Painel do proprietário', !textoEquipeSemLogin.includes('Painel do proprietário')],
    ['a equipe não vê Configurações no menu', !textoEquipeSemLogin.includes('Configurações')],
    ['a equipe vê a fila inteira da loja', textoEquipeSemLogin.includes(outroVendedor)],
  ]
  console.log('\n  Equipe (usa o sistema sem login)')
  for (const [rotulo, ok] of checagens) {
    if (!ok) falhas++
    console.log(`  ${ok ? '✅' : '❌'} ${rotulo}`)
  }

  const rotasEquipe: { rota: string; esperado: 'liberada' | 'proprietario' }[] = [
    { rota: '/pedidos', esperado: 'liberada' },
    { rota: '/clientes', esperado: 'liberada' },
    { rota: '/pedido/novo', esperado: 'liberada' },
    { rota: '/para-imprimir', esperado: 'liberada' },
    { rota: '/relatorio', esperado: 'liberada' },
    { rota: '/por-vendedor', esperado: 'liberada' },
    { rota: '/equipe', esperado: 'proprietario' },
    { rota: '/configuracoes', esperado: 'proprietario' },
  ]
  for (const { rota, esperado } of rotasEquipe) {
    const antes = erros.length
    dom.window.location.hash = `#${rota}`
    await espera(650)
    const texto = (raiz2.textContent ?? '').replace(/\s+/g, ' ')
    const novos = erros.slice(antes)
    const ok =
      texto.length > 200 &&
      !novos.length &&
      (esperado === 'liberada' || texto.includes('do proprietário'))
    if (!ok) falhas++
    console.log(
      `  ${ok ? '✅' : '❌'} ${rota.padEnd(28)} ${esperado === 'liberada' ? 'liberada' : 'só do proprietário'}`,
    )
    if (!ok) console.log('     TEXTO:', texto.slice(0, 160))
  }

  // a equipe vê os pedidos e clientes de todos (é uma loja só) e registra a fila
  // escolhendo o próprio nome na lista de funcionários
  dom.window.location.hash = '#/pedidos'
  await espera(900)
  const textoFilaEquipe = (raiz2.textContent ?? '').replace(/\s+/g, ' ')
  const veAFilaToda = textoFilaEquipe.includes(outroVendedor) && textoFilaEquipe.includes('Entregues')
  if (!veAFilaToda) falhas++
  console.log(`  ${veAFilaToda ? '✅' : '❌'} a equipe vê a fila completa (com ${outroVendedor})`)

  dom.window.location.hash = '#/clientes'
  await espera(700)
  const textoClientesEquipe = (raiz2.textContent ?? '').replace(/\s+/g, ' ')
  const veClientesTodos = textoClientesEquipe.includes('Clientes') && textoClientesEquipe.length > 500
  if (!veClientesTodos) falhas++
  console.log(`  ${veClientesTodos ? '✅' : '❌'} a equipe vê a carteira de clientes da loja`)

  dom.window.location.hash = '#/pedido/novo'
  await espera(900)
  const textoNovoPedidoEquipe = (raiz2.textContent ?? '').replace(/\s+/g, ' ')
  const escolheNomeOk =
    textoNovoPedidoEquipe.includes('Seu nome (funcionário)') &&
    textoNovoPedidoEquipe.includes(nomeDoVinculo) &&
    textoNovoPedidoEquipe.includes(outroVendedor) &&
    !textoNovoPedidoEquipe.includes('Vendedor responsável')
  if (!escolheNomeOk) falhas++
  console.log(`  ${escolheNomeOk ? '✅' : '❌'} ao registrar a fila a equipe escolhe o próprio nome na lista`)
  if (!escolheNomeOk) console.log('     TEXTO:', textoNovoPedidoEquipe.slice(0, 240))

  const { VERSAO } = await import('../src/lib/versao')
  const mostraVersao = textoEquipeSemLogin.includes(`v${VERSAO}`)
  if (!mostraVersao) falhas++
  console.log(`  ${mostraVersao ? '✅' : '❌'} o rodapé mostra a versão ${VERSAO} (conferir se o aparelho está atualizado)`)

  // porta administrativa com um dono já existente: pede o login do dono
  // (desmonta as telas anteriores: elas continuariam reagindo ao endereço e mudariam a rota)
  root1.unmount()
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
    textoPorta.includes('Login proprietário') &&
    textoPorta.includes('Usuário') &&
    textoPorta.includes('Entrar como proprietário') &&
    // quem descobrir a porta não encontra lista de nomes nem dados na tela
    !textoPorta.includes('Criar o acesso do proprietário') &&
    !textoPorta.includes(outroVendedor) &&
    !textoPorta.includes('Faturamento')
  if (!portaOk) falhas++
  console.log(`  ${portaOk ? '✅' : '❌'} o canto “Login proprietário” pede usuário e senha (sem dados na tela)`)
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
  const criarOk =
    textoCriar.includes('Criar o acesso do proprietário') &&
    textoCriar.includes('Login do proprietário') &&
    !textoCriar.includes('Entrar como proprietário')
  if (!criarOk) falhas++
  console.log(`  ${criarOk ? '✅' : '❌'} sem dono cadastrado, a porta cria o primeiro acesso do proprietário`)
  if (!criarOk) console.log('     TEXTO:', textoCriar.slice(0, 220))

  // 5 toques no logo (no sistema aberto para a equipe) abrem a porta do proprietário
  root5.unmount()
  await espera(150)
  dom.window.localStorage.removeItem('altoprints:sessao')
  dom.window.location.hash = '#/pedidos'
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
  const logoTap = [...raiz6.querySelectorAll('header button')].find((b) => (b.getAttribute('title') ?? '') === 'Altoprints') ?? null
  for (let i = 0; i < 5; i++) {
    logoTap?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    await espera(120)
  }
  await espera(800)
  const textoToques = (raiz6.textContent ?? '').replace(/\s+/g, ' ')
  const toquesOk =
    textoToques.includes('Criar o acesso do proprietário') || textoToques.includes('Entrar como proprietário')
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
