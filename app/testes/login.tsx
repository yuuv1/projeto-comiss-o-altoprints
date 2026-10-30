/**
 * Testes do acesso (roda num DOM simulado).
 *
 * O modelo de hoje: **só o proprietário tem login**. A equipe usa o sistema sem
 * conta — escolhe o próprio nome ao registrar uma fila. Aqui conferimos:
 * criar o acesso do dono, entrar/sair, senha errada, bloqueio de tentativas,
 * login de conta que não é dono, vários proprietários, troca/redefinição de
 * senha e as regras que impedem o sistema de ficar sem dono.
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
  const { FAIXAS_PADRAO } = await import('../src/lib/types')
  const { EQUIPE_INICIAL, CHAVE_EQUIPE_INICIAL, vendedoresDaEquipeInicial } = await import('../src/lib/equipe-inicial')
  const { validarSenha } = await import('../src/lib/usuario')
  const { gerarHashSenha } = await import('../src/lib/senha')
  const { salvarRegistro } = await import('../src/lib/backend')
  const { guardarUltimoFuncionario, ultimoFuncionario } = await import('../src/lib/funcionario')

  /* ------------------------ funções puras do acesso ------------------------ */
  igual('usuario normalizado (acentos e maiúsculas)', normalizarUsuario('  Jéssica Alves '), 'jessicaalves')
  igual('usuario remove símbolos estranhos', normalizarUsuario('jé$sica@2026'), 'jesica2026')
  igual('usuario curto é recusado', validarUsuario('ab'), 'O nome de usuário precisa ter pelo menos 3 letras.')
  igual('usuario válido passa', validarUsuario('carla'), '')
  igual('senha curta é recusada', validarSenha('12'), 'A senha precisa ter pelo menos 4 caracteres.')
  igual('senha no tamanho mínimo passa', validarSenha('1234'), '')
  igual('senha em branco não vale como senha', validarSenha('   '), 'A senha precisa ter pelo menos 4 caracteres.')
  igual('a equipe inicial tem os nomes de quem já trabalha aqui', EQUIPE_INICIAL.join(', '), 'JESSICA, RAISSA, ANDREIA')
  igual('faixas padrão têm 6 intervalos', FAIXAS_PADRAO.length, 6)

  /* --------------------- equipe inicial (sem conta) --------------------- */
  const semEquipe = { vendedores: [], clientes: [], pedidos: [], arquivos: [], impressoes: [], usuarios: [], configuracoes: {} } as never
  igual(
    'equipe inicial cria só vendedores (nenhuma conta de funcionário)',
    vendedoresDaEquipeInicial(semEquipe).map((v) => v.nome).sort(),
    EQUIPE_INICIAL.slice().sort(),
  )
  const comJessica = { ...(semEquipe as object), vendedores: [{ id: 'v1', nome: 'JESSICA', created_at: '' }] } as never
  igual(
    'equipe inicial não duplica quem já existe',
    vendedoresDaEquipeInicial(comJessica).map((v) => v.nome).sort(),
    ['ANDREIA', 'RAISSA'],
  )

  /* ------------------ nome do funcionário lembrado no aparelho ------------------ */
  igual('sem escolha anterior, nenhum funcionário vem marcado', ultimoFuncionario(), '')
  guardarUltimoFuncionario('v123')
  igual('a última escolha de funcionário é lembrada', ultimoFuncionario(), 'v123')
  guardarUltimoFuncionario('')
  igual('escolha vazia não apaga a lembrança', ultimoFuncionario(), 'v123')

  /* --------------------------- contexto real -------------------------- */
  type Auth = {
    usuario: { id: string; usuario: string; papel: string; ativo: boolean } | null
    ehProprietario: boolean
    temProprietario: boolean
    carregando: boolean
    entrar: (u: string, s: string, m: boolean) => Promise<void>
    sair: () => Promise<void>
    criarContaProprietario: (d: { nome: string; usuario: string; senha: string }) => Promise<void>
    criarOutroProprietario: (d: { nome: string; usuario: string; senha: string }) => Promise<void>
    trocarMinhaSenha: (a: string, n: string) => Promise<void>
    redefinirSenha: (id: string, nova: string) => Promise<void>
    alternarAtivo: (id: string, ativo: boolean) => Promise<void>
    excluirUsuario: (id: string) => Promise<void>
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
  // semeado. A única coisa criada de cara são os FUNCIONÁRIOS da equipe atual.
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
  igual('ninguém está logado ao abrir o sistema', pegar().usuario, null)
  igual('sem login, ninguém é tratado como proprietário', pegar().ehProprietario, false)
  igual(
    'a equipe atual já vem cadastrada como funcionários',
    (inicio?.vendedores ?? []).map((v: { nome: string }) => v.nome).sort(),
    EQUIPE_INICIAL.slice().sort(),
  )
  igual('nenhuma conta de funcionário é criada', (inicio?.usuarios ?? []).length, 0)
  igual(
    'a equipe inicial é criada uma única vez (marca no aparelho)',
    dom.window.localStorage.getItem(CHAVE_EQUIPE_INICIAL),
    '1',
  )

  /* ------------------------ conta do proprietário ---------------------- */
  await esperaErro(
    'senha curta é recusada ao criar o acesso',
    pegar().criarContaProprietario({ nome: 'Dona', usuario: 'dona', senha: '12' }),
    'pelo menos 4',
  )
  await esperaErro(
    'usuário curto é recusado ao criar o acesso',
    pegar().criarContaProprietario({ nome: 'Dona', usuario: 'do', senha: '1234' }),
    'pelo menos 3',
  )
  await pegar().criarContaProprietario({ nome: 'Dona do Sistema', usuario: 'Dona', senha: '1234' })
  await respirar()
  igual('proprietário criado e logado', pegar().usuario?.usuario, 'dona')
  igual('agora o sistema tem proprietário', pegar().temProprietario, true)
  igual('o dono é reconhecido como proprietário', pegar().ehProprietario, true)
  igual('a senha do dono nunca é guardada em texto puro', conta('dona')?.senha_hash === '1234', false)
  igual('a conta do dono não é ligada a funcionário', conta('dona')?.vendedor_id, '')

  await esperaErro(
    'não deixa criar um segundo dono pela porta da primeira vez',
    pegar().criarContaProprietario({ nome: 'Outro', usuario: 'outro', senha: '1234' }),
    'já tem um proprietário',
  )

  /* ------------------------------- entrar ----------------------------- */
  await pegar().sair()
  await respirar()
  igual('depois de sair não há usuário', pegar().usuario, null)
  igual('sair apaga a sessão guardada', Boolean(dom.window.localStorage.getItem('altoprints:sessao')), false)
  igual('o sistema continua sabendo que existe um dono', pegar().temProprietario, true)
  await esperaErro('senha errada é recusada', pegar().entrar('dona', '9999', true), 'Usuário ou senha inválidos')
  await esperaErro('usuário inexistente é recusado', pegar().entrar('ninguem', '1234', true), 'Usuário ou senha inválidos')
  await pegar().entrar('DONA', '1234', true)
  await respirar()
  igual('entrou com o usuário em maiúsculas', pegar().usuario?.usuario, 'dona')
  igual('sessão guardada', Boolean(dom.window.localStorage.getItem('altoprints:sessao')), true)

  /* ------------- conta de funcionário (de versão antiga) não entra ------------- */
  await pegar().sair()
  await respirar()
  await salvarRegistro('usuarios', {
    id: 'conta-antiga-jessica',
    nome: 'JESSICA',
    usuario: 'jessica',
    senha_hash: await gerarHashSenha('4321'),
    papel: 'vendedor',
    vendedor_id: inicio.vendedores[0].id,
    ativo: true,
    criado_em: new Date().toISOString(),
  })
  await esperaErro(
    'conta de funcionário é recusada no login (só o dono tem login)',
    pegar().entrar('jessica', '4321', true),
    'exclusivo do proprietário',
  )
  await pegar().entrar('dona', '1234', true)
  await respirar()

  /* ---------------- o dono cria outros acessos de proprietário --------------- */
  const sessaoAntes = pegar().usuario?.usuario
  await pegar().criarOutroProprietario({ nome: 'Sócio', usuario: 'socio', senha: '1234' })
  await respirar()
  igual('criar outro dono não troca a sessão de quem criou', pegar().usuario?.usuario, sessaoAntes)
  igual('o segundo dono foi criado', Boolean(conta('socio')), true)
  igual('o segundo dono entra como proprietário', conta('socio')?.papel, 'proprietario')
  await esperaErro(
    'nome de usuário repetido é recusado',
    pegar().criarOutroProprietario({ nome: 'Outra', usuario: 'DONA', senha: '1111' }),
    'já está em uso',
  )
  igual('nenhuma conta duplicada foi criada', banco().usuarios.filter((u: { usuario: string }) => u.usuario === 'dona').length, 1)

  /* ----------------------- trocar / redefinir senha ----------------------- */
  await esperaErro('troca de senha exige a senha atual', pegar().trocarMinhaSenha('errada', '5555'), 'senha atual não confere')
  await pegar().trocarMinhaSenha('1234', '5555')
  await respirar()
  await pegar().sair()
  await respirar()
  await esperaErro('senha antiga não funciona mais', pegar().entrar('dona', '1234', true), 'Usuário ou senha inválidos')
  await pegar().entrar('dona', '5555', true)
  await respirar()
  igual('senha nova funciona', pegar().usuario?.usuario, 'dona')

  const idSocio = conta('socio').id
  await esperaErro(
    'redefinir a própria senha é pela tela Meu acesso',
    pegar().redefinirSenha(pegar().usuario?.id ?? '', '9999'),
    'Meu acesso',
  )
  await pegar().redefinirSenha(idSocio, '4321')
  await respirar()
  await pegar().sair()
  await respirar()
  await pegar().entrar('socio', '4321', true)
  await respirar()
  igual('a senha redefinida pelo dono funciona', pegar().usuario?.usuario, 'socio')

  /* ------------- vários proprietários: desativar e excluir -------------- */
  const idDona = conta('dona').id
  await esperaErro('ninguém exclui o próprio acesso', pegar().excluirUsuario(idSocio), 'próprio acesso')
  await esperaErro('ninguém desativa o próprio acesso', pegar().alternarAtivo(idSocio, false), 'próprio acesso')

  await pegar().alternarAtivo(idDona, false)
  await respirar()
  igual('um dono pode ser desativado (resta outro ativo)', conta('dona')?.ativo, false)
  await pegar().sair()
  await respirar()
  await esperaErro('dono desativado não entra', pegar().entrar('dona', '5555', true), 'desativado')
  await pegar().entrar('socio', '4321', true)
  await respirar()
  await pegar().alternarAtivo(idDona, true)
  await respirar()
  igual('o dono pode ser reativado', conta('dona')?.ativo, true)

  // exclusão: só sobra o sócio, então a dona pode sair
  await pegar().excluirUsuario(idDona)
  await respirar()
  igual('o acesso excluído saiu do sistema', Boolean(conta('dona')), false)

  // agora o sócio é o único proprietário: nem ele nem o sistema podem ficar sem dono
  await esperaErro('o único proprietário ativo não pode ser excluído', pegar().excluirUsuario(idSocio), 'próprio acesso')
  igual('o sistema continua com um proprietário ativo', pegar().temProprietario, true)

  /* ---------------------- limite de tentativas ------------------------ */
  await pegar().sair()
  await respirar()
  for (let i = 0; i < 5; i++) {
    try {
      await pegar().entrar('socio', 'senhaerrada', true)
    } catch {
      /* esperado */
    }
    await espera(20)
  }
  await esperaErro('bloqueia depois de várias tentativas', pegar().entrar('socio', '4321', true), 'Muitas tentativas')

  /* ---------------------- aparência (tema e densidade) ---------------------- */
  {
    const { aplicarAparicao, LABEL_DENSIDADE } = await import('../src/lib/tema')
    const raizHtml = dom.window.document.documentElement

    aplicarAparicao({ tema: 'escuro', densidade: 'confortavel' })
    igual('tema escuro liga a classe no <html>', raizHtml.classList.contains('dark'), true)
    igual('modo confortável liga a classe no <html>', raizHtml.classList.contains('confortavel'), true)

    aplicarAparicao({ tema: 'claro', densidade: 'compacto' })
    igual('tema claro desliga a classe escura', raizHtml.classList.contains('dark'), false)
    igual('modo compacto é o padrão (sem classe)', raizHtml.classList.contains('confortavel'), false)
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
  console.error(e)
  process.exit(1)
})
