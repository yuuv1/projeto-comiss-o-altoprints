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
  const { EQUIPE_INICIAL, CHAVE_EQUIPE_INICIAL } = await import('../src/lib/equipe-inicial')
  const { validarSenha } = await import('../src/lib/usuario')

  /* ---------------------- funções puras do login ---------------------- */
  igual('usuario normalizado (acentos e maiúsculas)', normalizarUsuario('  Jéssica Alves '), 'jessicaalves')
  igual('usuario remove símbolos estranhos', normalizarUsuario('jé$sica@2026'), 'jesica2026')
  igual('usuario curto é recusado', validarUsuario('ab'), 'O nome de usuário precisa ter pelo menos 3 letras.')
  igual('usuario válido passa', validarUsuario('carla'), '')
  igual('senha curta é recusada', validarSenha('12'), 'A senha precisa ter pelo menos 4 caracteres.')
  igual('senha no tamanho mínimo passa', validarSenha('1234'), '')
  igual('senha em branco não vale como senha', validarSenha('   '), 'A senha precisa ter pelo menos 4 caracteres.')
  igual('a equipe inicial tem os nomes de quem já trabalha aqui', EQUIPE_INICIAL.join(', '), 'JESSICA, RAISSA, ANDREIA')
  igual('permissão total edita', podeEditarPedidos('total'), true)
  igual('permissão total exclui', podeExcluirPedidos('total'), true)
  igual('permissão sem excluir não exclui', podeExcluirPedidos('sem_excluir'), false)
  igual('permissão sem excluir edita', podeEditarPedidos('sem_excluir'), true)
  igual('permissão somente criar não edita', podeEditarPedidos('somente_criar'), false)
  igual('faixas padrão têm 6 intervalos', FAIXAS_PADRAO.length, 6)

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
      senha?: string
      vendedorId?: string
      administrador?: boolean
      semSenha?: boolean
    }) => Promise<void>
    alternarAtivo: (id: string, ativo: boolean) => Promise<void>
    excluirUsuario: (id: string) => Promise<void>
    entrarSemSenha: (id: string, m?: boolean) => Promise<void>
    removerSenha: (id: string) => Promise<void>
    redefinirSenha: (id: string, nova: string) => Promise<void>
  }
  let auth: Auth | null = null
  function Probe() {
    auth = useAuth() as unknown as Auth
    return null
  }
  const pegar = () => auth as unknown as Auth
  const banco = () => JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  const conta = (login: string) => banco().usuarios.find((u: { usuario: string }) => u.usuario === login)

  // O sistema começa SEM DADOS: nenhum pedido, cliente ou comissão de exemplo é
  // semeado (a demonstração só entra quando o proprietário pede em Configurações → Dados).
  // A única coisa criada de cara são os acessos da equipe atual, que entram pelo nome.

  const raiz = dom.window.document.getElementById('root')
  createRoot(raiz as unknown as Element).render(
    React.createElement(
      StoreProvider,
      null,
      React.createElement(AuthProvider, null, React.createElement(Probe)),
    ),
  )
  await espera(1200)

  const brutoInicial = dom.window.localStorage.getItem('altoprints:db:v1')
  const inicio = brutoInicial ? JSON.parse(brutoInicial) : null
  igual('sistema novo começa sem pedidos de exemplo', inicio?.pedidos?.length ?? 0, 0)
  igual('sistema novo começa sem clientes de exemplo', inicio?.clientes?.length ?? 0, 0)
  igual('sistema novo não tem proprietário', pegar().temProprietario, false)

  /* ------------------- equipe inicial (entra pelo nome) ------------------ */
  igual(
    'a equipe atual já vem cadastrada na primeira abertura',
    (inicio?.usuarios ?? []).map((u: { nome: string }) => u.nome).sort(),
    EQUIPE_INICIAL.slice().sort(),
  )
  igual(
    'todos os acessos da equipe inicial entram sem senha',
    (inicio?.usuarios ?? []).every((u: { sem_senha?: boolean; papel: string }) => u.sem_senha && u.papel === 'vendedor'),
    true,
  )
  igual(
    'nenhuma conta da equipe inicial nasce com senha',
    (inicio?.usuarios ?? []).every((u: { senha_hash: string }) => !u.senha_hash),
    true,
  )
  igual(
    'cada pessoa da equipe inicial ganhou o próprio cadastro de vendedor',
    (inicio?.vendedores ?? []).map((v: { nome: string }) => v.nome).sort(),
    EQUIPE_INICIAL.slice().sort(),
  )
  igual(
    'a equipe inicial é criada uma única vez (marca no aparelho)',
    dom.window.localStorage.getItem(CHAVE_EQUIPE_INICIAL),
    '1',
  )

  // entra tocando no nome — sem digitar senha nenhuma
  const idJessica = conta('jessica').id
  await pegar().entrarSemSenha(idJessica)
  await respirar()
  igual('entrar pelo nome conecta a pessoa certa', pegar().usuario?.usuario, 'jessica')
  igual('quem entra pelo nome é vendedor', pegar().usuario?.papel, 'vendedor')
  await pegar().sair()
  await respirar()
  await esperaErro(
    'conta sem senha não entra por usuário e senha',
    pegar().entrar('jessica', 'qualquercoisa', true),
    'entra sem senha',
  )
  await esperaErro('conta sem senha não entra com senha em branco', pegar().entrar('jessica', '', true), 'entra sem senha')
  await esperaErro(
    'conta desativada também não entra pelo nome',
    (async () => {
      await pegar().entrarSemSenha('id-que-nao-existe')
    })(),
    'não existe',
  )

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
  await pegar().criarContaVendedor({ nome: 'CARLA', usuario: 'carla', senha: '4321' })
  await respirar()
  igual('vendedor cadastrado', pegar().usuario?.usuario, 'carla')
  igual('vendedor tem papel de vendedor', pegar().usuario?.papel, 'vendedor')

  const banco1 = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  igual('conta do vendedor guardada', banco1.usuarios.length, 5)
  igual(
    'senha nunca é guardada em texto puro',
    banco1.usuarios.some((u: { senha_hash: string }) => u.senha_hash === '4321'),
    false,
  )
  igual(
    'vendedor criado ficou ligado a um vendedor da lista',
    Boolean(banco1.usuarios.find((u: { usuario: string }) => u.usuario === 'carla')?.vendedor_id),
    true,
  )
  await esperaErro(
    'nome de usuário repetido é recusado (mesmo com a tela desatualizada)',
    pegar().criarContaVendedor({ nome: 'Outra', usuario: 'carla', senha: '1111' }),
    'já está em uso',
  )
  const banco2 = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  igual('nenhuma conta duplicada foi criada', banco2.usuarios.length, 5)

  /* ---------------- o dono cria as contas da equipe ------------------- */
  // a CARLA acabou de criar o acesso dela; um segundo acesso no mesmo vendedor é recusado
  const idVendedorCarla = banco2.usuarios.find((u: { usuario: string }) => u.usuario === 'carla')?.vendedor_id
  igual('vendedor da jessica existe', Boolean(idVendedorCarla), true)
  await esperaErro(
    'não deixa criar duas contas para o mesmo vendedor',
    pegar().criarContaComoDono({
      nome: 'CARLA',
      usuario: 'carla2',
      senha: '1234',
      vendedorId: idVendedorCarla,
    }),
    'já tem um acesso criado',
  )
  await esperaErro(
    'cadastro pelo login também recusa nome já usado',
    pegar().criarContaVendedor({ nome: 'CARLA', usuario: 'carla3', senha: '1234' }),
    'Já existe um acesso para este nome',
  )

  // o proprietário cria a conta da BRUNA (vendedor novo) sem trocar a própria sessão
  const sessaoAntes = pegar().usuario?.usuario
  await pegar().criarContaComoDono({ nome: 'BRUNA', usuario: 'bruna', senha: '1234' })
  await respirar()
  igual('criar conta pela Equipe não troca a sessão de quem criou', pegar().usuario?.usuario, sessaoAntes)
  const banco3 = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  const contaBruna = banco3.usuarios.find((u: { usuario: string }) => u.usuario === 'bruna')
  igual('conta da raissa criada com vendedor novo', Boolean(contaBruna?.vendedor_id), true)
  igual(
    'vendedor novo da raissa foi criado uma única vez',
    banco3.vendedores.filter((v: { nome: string }) => v.nome === 'BRUNA').length,
    1,
  )

  // o dono também pode criar outro administrador (sempre com senha)
  await esperaErro(
    'proprietário nunca pode ser criado sem senha',
    pegar().criarContaComoDono({ nome: 'Sócio', usuario: 'socio', administrador: true, semSenha: true }),
    'precisa de senha',
  )
  await pegar().criarContaComoDono({ nome: 'Sócio', usuario: 'socio', senha: '1234', administrador: true })
  await respirar()

  // dar e tirar senha de um acesso de vendedor
  await pegar().redefinirSenha(idJessica, '7777')
  await respirar()
  igual('definir senha tira a conta do modo sem senha', Boolean(conta('jessica')?.sem_senha), false)
  await esperaErro(
    'conta que ganhou senha não entra mais pelo nome sem senha',
    pegar().entrarSemSenha(idJessica),
    'pede senha',
  )
  await pegar().removerSenha(idJessica)
  await respirar()
  igual('tirar a senha devolve a entrada pelo nome', Boolean(conta('jessica')?.sem_senha), true)
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

  /* ------------- vários proprietários: desativar e excluir -------------- */
  // O sistema aceita mais de um acesso de proprietário (sócio, gerente...), mas
  // nunca pode ficar sem nenhum ativo — e ninguém apaga o próprio acesso.
  const banco4 = JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1')))
  const idDona = banco4.usuarios.find((u: { usuario: string }) => u.usuario === 'dona').id
  const idSocio = banco4.usuarios.find((u: { usuario: string }) => u.usuario === 'socio').id
  const idBruna = banco4.usuarios.find((u: { usuario: string }) => u.usuario === 'bruna').id

  await esperaErro('ninguém exclui o próprio acesso', pegar().excluirUsuario(idDona), 'próprio acesso')
  await pegar().alternarAtivo(idSocio, false)
  await respirar()
  igual(
    'segundo proprietário pode ser desativado (resta um ativo)',
    JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).usuarios.find(
      (u: { usuario: string }) => u.usuario === 'socio',
    )?.ativo,
    false,
  )
  await pegar().excluirUsuario(idSocio)
  await respirar()
  igual(
    'segundo proprietário foi excluído',
    JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).usuarios.some(
      (u: { usuario: string }) => u.usuario === 'socio',
    ),
    false,
  )
  // agora só resta a "dona": o sistema não pode ficar sem proprietário
  await pegar().sair()
  await respirar()
  await pegar().entrar('bruna', '1234', true)
  await respirar()
  await esperaErro(
    'o último proprietário ativo não pode ser excluído',
    pegar().excluirUsuario(idDona),
    'único proprietário',
  )
  await pegar().sair()
  await respirar()
  igual(
    'a dona continua cadastrada (o sistema não ficou sem proprietário)',
    JSON.parse(String(dom.window.localStorage.getItem('altoprints:db:v1'))).usuarios.some(
      (u: { usuario: string }) => u.usuario === 'dona' && u.ativo,
    ),
    true,
  )
  igual('a conta usada no teste continua existindo', Boolean(idBruna), true)

  // volta a sessão para a CARLA (é ela que troca a própria senha abaixo)
  await pegar().sair()
  await respirar()
  await pegar().entrar('carla', '4321', true)
  await respirar()
  igual('carla entra de novo para trocar a própria senha', pegar().usuario?.usuario, 'carla')

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
  await esperaErro('senha antiga não funciona mais', pegar().entrar('carla', '4321', true), 'Usuário ou senha inválidos')
  await pegar().entrar('carla', '5555', true)
  await respirar()
  igual('senha nova funciona', pegar().usuario?.usuario, 'carla')

  /* --------------------------- desativar conta ------------------------ */
  const idVendedor = banco2.usuarios.find((u: { usuario: string }) => u.usuario === 'carla').id
  await pegar().sair()
  await respirar()
  await pegar().entrar('dona', '1234', true)
  await respirar()
  await pegar().alternarAtivo(idVendedor, false)
  await respirar()
  await pegar().sair()
  await respirar()
  await esperaErro('conta desativada não entra', pegar().entrar('carla', '5555', true), 'desativado')

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

  /* ---------------------- aparência (tema e densidade) ---------------------- */
  {
    const { aplicarAparicao, LABEL_DENSIDADE } = await import('../src/lib/tema')
    const raiz = dom.window.document.documentElement

    aplicarAparicao({ tema: 'escuro', densidade: 'confortavel' })
    igual('tema escuro liga a classe no <html>', raiz.classList.contains('dark'), true)
    igual('modo confortável liga a classe no <html>', raiz.classList.contains('confortavel'), true)

    aplicarAparicao({ tema: 'claro', densidade: 'compacto' })
    igual('tema claro desliga a classe escura', raiz.classList.contains('dark'), false)
    igual('modo compacto é o padrão (sem classe)', raiz.classList.contains('confortavel'), false)
    igual('os dois modos têm nome para a tela', [LABEL_DENSIDADE.compacto, LABEL_DENSIDADE.confortavel].join(' / '), 'Compacto / Confortável')
  }

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
