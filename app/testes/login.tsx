/**
 * Testes do login (roda num DOM simulado).
 * Verifica: criar conta do proprietário, entrar, senha errada, conta desativada,
 * cadastro de vendedor, usuário repetido, troca de senha, permissões e bloqueio
 * por excesso de tentativas.
 *
 * Rode com:  npm run testar
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
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
g.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })

console.error = (...args: unknown[]) => {
  const texto = args.map(String).join(' ')
  if (!texto.includes('not wrapped in act')) console.log('   [console.error]', texto.slice(0, 200))
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** deixa o React terminar de atualizar a tela antes de conferir */
const respirar = () => espera(150)

let ok = 0
const falhas: string[] = []
const igual = (descricao: string, recebido: unknown, esperado: unknown) => {
  if (JSON.stringify(recebido) === JSON.stringify(esperado)) ok++
  else
    falhas.push(
      `${descricao}\n     recebido: ${JSON.stringify(recebido)}\n     esperado: ${JSON.stringify(esperado)}`,
    )
}

async function esperaErro(descricao: string, promessa: Promise<unknown>, contem: string) {
  try {
    await promessa
    await respirar()
    falhas.push(`${descricao}\n     esperava o erro "${contem}" mas deu certo`)
  } catch (e) {
    await respirar()
    const msg = (e as Error).message
    if (msg.includes(contem)) ok++
    else
      falhas.push(
        `${descricao}\n     mensagem recebida: "${msg}"\n     esperava conter: "${contem}"`,
      )
  }
}

async function main() {
  const { createRoot } = await import('react-dom/client')
  const React = await import('react')
  const { StoreProvider } = await import('../src/lib/store')
  const { AuthProvider, useAuth, normalizarUsuario, validarUsuario } = await import('../src/lib/auth')
  const { podeEditarPedidos, podeExcluirPedidos, FAIXAS_PADRAO } = await import('../src/lib/types')

  /* ---------------------- funções puras do login ---------------------- */
  igual('usuario normalizado (acentos e maiúsculas)', normalizarUsuario('  Jéssica Alves '), 'jessicaalves')
  igual('usuario remove símbolos estranhos', normalizarUsuario('jé$sica@2026'), 'jesica2026')
  igual('usuario curto é recusado', validarUsuario('ab'), 'O nome de usuário precisa ter pelo menos 3 letras.')
  igual('usuario válido passa', validarUsuario('jessica'), '')
  igual('permissão total edita', podeEditarPedidos('total'), true)
  igual('permissão total exclui', podeExcluirPedidos('total'), true)
  igual('permissão sem excluir não exclui', podeExcluirPedidos('sem_excluir'), false)
  igual('permissão sem excluir edita', podeEditarPedidos('sem_excluir'), true)
  igual('permissão somente criar não edita', podeEditarPedidos('somente_criar'), false)
  igual('faixas padrão têm 5 intervalos', FAIXAS_PADRAO.length, 5)

  /* --------------------------- contexto real -------------------------- */
  type Auth = {
    usuario: { id: string; usuario: string; papel: string; ativo: boolean } | null
    temProprietario: boolean
    entrar: (u: string, s: string, m: boolean) => Promise<void>
    sair: () => Promise<void>
    criarContaProprietario: (d: { nome: string; usuario: string; senha: string }) => Promise<void>
    criarContaVendedor: (d: { nome: string; usuario: string; senha: string }) => Promise<void>
    trocarMinhaSenha: (a: string, n: string) => Promise<void>
    criarContaComoDono: (d: {
      nome: string
      usuario: string
      senha: string
      vendedorId?: string
      administrador?: boolean
    }) => Promise<void>
    alternarAtivo: (id: string, ativo: boolean) => Promise<void>
  }
  let auth: Auth | null = null
  function Probe() {
    auth = useAuth() as unknown as Auth
    return null
  }
  const pegar = () => auth as unknown as Auth

  const raiz = dom.window.document.getElementById('root')
  createRoot(raiz as unknown as Element).render(
    React.createElement(
      StoreProvider,
      null,
      React.createElement(AuthProvider, null, React.createElement(Probe)),
    ),
  )
  await espera(1200)

  igual('sistema novo não tem proprietário', pegar().temProprietario, false)

  /* ------------------------ conta do proprietário ---------------------- */
  await pegar().criarContaProprietario({ nome: 'Dona do Sistema', usuario: 'Dona', senha: '1234' })
  await respirar()
  igual('proprietário criado e logado', pegar().usuario?.usuario, 'dona')
  igual('agora o sistema tem proprietário', pegar().temProprietario, true)

  await esperaErro(
    'não deixa criar um segundo proprietário',
    pegar().criarContaProprietario({ nome: 'Outro', usuario: 'outro', senha: '1234' }),
    'já tem um proprietário',
  )

  /* ------------------------------- entrar ----------------------------- */
  await pegar().sair()
  await respirar()
  igual('depois de sair não há usuário', pegar().usuario, null)
  await esperaErro('senha errada é recusada', pegar().entrar('dona', '9999', true), 'Usuário ou senha inválidos')
  await esperaErro('usuário inexistente é recusado', pegar().entrar('ninguem', '1234', true), 'Usuário ou senha inválidos')
  await pegar().entrar('DONA', '1234', true)
  await respirar()
  igual('entrou com o usuário em maiúsculas', pegar().usuario?.usuario, 'dona')
  igual('sessão guardada', Boolean(dom.window.localStorage.getItem('altoprints:sessao')), true)

  /* ------------------------- conta do vendedor ------------------------ */
  await pegar().criarContaVendedor({ nome: 'JESSICA', usuario: 'jessica', senha: '4321' })
  await respirar()
  igual('vendedor cadastrado', pegar().usuario?.usuario, 'jessica')
  igual('vendedor tem papel de vendedor', pegar().usuario?.papel, 'vendedor')

  const banco1 = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  igual('conta do vendedor guardada', banco1.usuarios.length, 2)
  igual(
    'senha nunca é guardada em texto puro',
    banco1.usuarios.some((u: { senha_hash: string }) => u.senha_hash === '4321'),
    false,
  )
  igual(
    'vendedor criado ficou ligado a um vendedor da lista',
    Boolean(banco1.usuarios.find((u: { usuario: string }) => u.usuario === 'jessica')?.vendedor_id),
    true,
  )
  await esperaErro(
    'nome de usuário repetido é recusado (mesmo com a tela desatualizada)',
    pegar().criarContaVendedor({ nome: 'Outra', usuario: 'jessica', senha: '1111' }),
    'já está em uso',
  )
  const banco2 = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  igual('nenhuma conta duplicada foi criada', banco2.usuarios.length, 2)

  /* ---------------- o dono cria as contas da equipe ------------------- */
  // a JESSICA acabou de criar o acesso dela; um segundo acesso no mesmo vendedor é recusado
  const idVendedorJessica = banco2.usuarios.find((u: { usuario: string }) => u.usuario === 'jessica')?.vendedor_id
  igual('vendedor da jessica existe', Boolean(idVendedorJessica), true)
  await esperaErro(
    'não deixa criar duas contas para o mesmo vendedor',
    pegar().criarContaComoDono({
      nome: 'JESSICA',
      usuario: 'jessica2',
      senha: '1234',
      vendedorId: idVendedorJessica,
    }),
    'já tem um acesso criado',
  )
  await esperaErro(
    'cadastro pelo login também recusa nome já usado',
    pegar().criarContaVendedor({ nome: 'JESSICA', usuario: 'jessica3', senha: '1234' }),
    'Já existe um acesso para este nome',
  )

  // o proprietário cria a conta da RAISSA (vendedor novo) sem trocar a própria sessão
  const sessaoAntes = pegar().usuario?.usuario
  await pegar().criarContaComoDono({ nome: 'RAISSA', usuario: 'raissa', senha: '1234' })
  await respirar()
  igual('criar conta pela Equipe não troca a sessão de quem criou', pegar().usuario?.usuario, sessaoAntes)
  const banco3 = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  const contaRaissa = banco3.usuarios.find((u: { usuario: string }) => u.usuario === 'raissa')
  igual('conta da raissa criada com vendedor novo', Boolean(contaRaissa?.vendedor_id), true)
  igual(
    'vendedor novo da raissa foi criado uma única vez',
    banco3.vendedores.filter((v: { nome: string }) => v.nome === 'RAISSA').length,
    1,
  )

  // o dono também pode criar outro administrador
  await pegar().criarContaComoDono({ nome: 'Sócio', usuario: 'socio', senha: '1234', administrador: true })
  await respirar()
  await pegar().sair()
  await respirar()
  await pegar().entrar('socio', '1234', true)
  await respirar()
  igual('conta criada como administrador entra como proprietário', pegar().usuario?.papel, 'proprietario')
  igual('usuário criado pelo dono aparece no sistema', pegar().usuario?.usuario, 'socio')
  await pegar().sair()
  await respirar()
  await pegar().entrar('dona', '1234', true)
  await respirar()
  igual('dono volta a entrar normalmente', pegar().usuario?.usuario, 'dona')

  // volta a sessão para a JESSICA (é ela que troca a própria senha abaixo)
  await pegar().sair()
  await respirar()
  await pegar().entrar('jessica', '4321', true)
  await respirar()
  igual('jessica entra de novo para trocar a própria senha', pegar().usuario?.usuario, 'jessica')

  /* --------------------------- trocar senha --------------------------- */
  await esperaErro(
    'troca de senha exige a senha atual',
    pegar().trocarMinhaSenha('errada', '5555'),
    'senha atual não confere',
  )
  await pegar().trocarMinhaSenha('4321', '5555')
  await respirar()
  await pegar().sair()
  await respirar()
  await esperaErro('senha antiga não funciona mais', pegar().entrar('jessica', '4321', true), 'Usuário ou senha inválidos')
  await pegar().entrar('jessica', '5555', true)
  await respirar()
  igual('senha nova funciona', pegar().usuario?.usuario, 'jessica')

  /* --------------------------- desativar conta ------------------------ */
  const idVendedor = banco2.usuarios.find((u: { usuario: string }) => u.usuario === 'jessica').id
  await pegar().sair()
  await respirar()
  await pegar().entrar('dona', '1234', true)
  await respirar()
  await pegar().alternarAtivo(idVendedor, false)
  await respirar()
  await pegar().sair()
  await respirar()
  await esperaErro('conta desativada não entra', pegar().entrar('jessica', '5555', true), 'desativado')

  /* ---------------------- limite de tentativas ------------------------ */
  for (let i = 0; i < 5; i++) {
    try {
      await pegar().entrar('dona', 'senhaerrada', true)
    } catch {
      /* esperado */
    }
    await espera(20)
  }
  await esperaErro('bloqueia depois de várias tentativas', pegar().entrar('dona', '1234', true), 'Muitas tentativas')

  console.log(`\n✅ ${ok} verificações passaram`)
  if (falhas.length) {
    console.log(`\n❌ ${falhas.length} falha(s):`)
    for (const f of falhas) console.log('  - ' + f)
    process.exit(1)
  }
}

main().catch((e) => {
  console.log('Falha geral nos testes de login:', e)
  process.exit(2)
})
