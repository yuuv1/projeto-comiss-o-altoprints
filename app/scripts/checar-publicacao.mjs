/**
 * Guarda de publicação — confere se o sistema pode ir para o ar.
 *
 * Uso:  npm run checar          (depois de npm run build ou npm run publicar)
 *
 * O que ele olha (e por quê):
 *   1. ARQUIVO GERADO — procura no pacote publicado qualquer rastro de
 *      usuário/senha de exemplo ou de dado de pessoa real. O sistema já nasce
 *      vazio; se algo assim aparecer no build, é porque voltou sem querer.
 *   2. CHAVES — nenhuma chave SECRETA do Supabase pode entrar no pacote
 *      (a chave pública pode; a secreta dá acesso total ao banco).
 *   3. ESTRUTURA — index.html, assets/, _redirects e o LEIA-ME precisam existir
 *      e concordar com a versão do package.json.
 *
 * Sai com código 1 quando encontra problema: assim o robô do GitHub e o
 * `npm run publicar` param antes de entregar um pacote sujo.
 */
import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const app = resolve(aqui, '..')
const raiz = resolve(app, '..')

/* ------------------------------------------------------------------ */
/* o que não pode aparecer no pacote publicado                         */
/* ------------------------------------------------------------------ */

/** credenciais/atalhos de versões antigas — o sistema não tem mais senha padrão */
const PROIBIDOS = [
  { padrao: /ACESSO_DEMO|contaDemo|MARCA_SENHA_DEMO|prepararAcessoDemo/, motivo: 'código do acesso de exemplo' },
  { padrao: /usuario:\s*"gui"|usuario:\s*'gui'|"gui"\s*,\s*senha/i, motivo: 'usuário de exemplo "gui"' },
  { padrao: /senha:\s*"12345"|senha:\s*'12345'|senha"\s*:\s*"12345"/, motivo: 'senha de exemplo "12345"' },
  { padrao: /definir-no-primeiro-uso/, motivo: 'marca da senha de exemplo' },
  { padrao: /demo-inicial-carregada"\s*\)\s*===\s*"1"/, motivo: 'carga automática dos dados de exemplo' },
  /* nomes/contatos que vieram do sistema antigo — dados de pessoas reais */
  { padrao: /IVANETE|JAMIR|KATHERYN|TALLITA|LORRAINE|NUBIA|LIDIMO|IVANILDE|JAKELINE/i, motivo: 'nome de cliente real (sistema antigo)' },
  { padrao: /\(64\)\s*9\d{4}-\d{4}/, motivo: 'telefone com DDD real (sistema antigo)' },
  /* chave secreta do Supabase nunca pode ir para o navegador (a PÚBLICA pode, e
     o próprio código cita "sb_secret_" só para conseguir recusá-la — por isso o
     padrão aqui exige o tamanho de uma chave de verdade) */
  { padrao: /sb_secret_[A-Za-z0-9_-]{16,}/, motivo: 'chave SECRETA do Supabase' },
]

/**
 * A chave pública antiga (anon) e a secreta (service_role) são JWTs parecidos.
 * Só o "payload" diz qual é qual — então abrimos cada JWT do pacote e olhamos o
 * papel dele. A publishable (sb_publishable_) não é JWT e não entra aqui.
 */
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g
const ehChaveSecreta = (jwt) => {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(payload, 'base64').toString('utf8').includes('service_role')
  } catch {
    return false
  }
}

/** arquivos que jamais podem estar dentro da pasta publicada */
const ARQUIVOS_PROIBIDOS = ['.env', '.env.local', '.env.production', '.npmrc', '.git']

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

const listaArquivos = async (pasta) => {
  const saida = []
  const entrar = async (atual) => {
    for (const item of await readdir(atual, { withFileTypes: true })) {
      const caminho = join(atual, item.name)
      if (item.isDirectory()) await entrar(caminho)
      else saida.push(caminho)
    }
  }
  if (existsSync(pasta)) await entrar(pasta)
  return saida
}

const problemas = []
const avisos = []
const certos = []

/* ------------------------------------------------------------------ */
/* 1) onde está o pacote?                                              */
/* ------------------------------------------------------------------ */

const publicar = resolve(raiz, 'publicar')
const dist = resolve(app, 'dist')
const pasta = existsSync(publicar) ? publicar : existsSync(dist) ? dist : null

if (!pasta) {
  console.log('\n❌ Nada para conferir: rode "npm run publicar" (ou "npm run build") antes.\n')
  process.exit(1)
}

const pacote = JSON.parse(await readFile(resolve(app, 'package.json'), 'utf8'))
console.log(`\n🔎 Conferindo o pacote: ${pasta}`)
console.log(`   versão do sistema: ${pacote.version}\n`)

const arquivos = await listaArquivos(pasta)

/* ------------------------------------------------------------------ */
/* 2) arquivo proibido dentro do pacote                                */
/* ------------------------------------------------------------------ */

for (const caminho of arquivos) {
  const nome = dirname(caminho) === pasta ? caminho.slice(pasta.length + 1) : caminho.slice(pasta.length + 1)
  if (ARQUIVOS_PROIBIDOS.includes(nome.split('/').pop())) problemas.push(`arquivo que não pode ser publicado: ${nome}`)
}
if (!problemas.length) certos.push('nenhum arquivo de segredos (.env) dentro do pacote')

/* ------------------------------------------------------------------ */
/* 3) conteúdo proibido nos arquivos de texto                          */
/* ------------------------------------------------------------------ */

const textoChecados = arquivos.filter((c) => /\.(js|mjs|css|html|txt|json|map)$/i.test(c))
let achados = 0
for (const caminho of textoChecados) {
  const info = await stat(caminho)
  if (info.size > 40 * 1024 * 1024) continue
  const conteudo = await readFile(caminho, 'utf8')
  const relativo = caminho.slice(pasta.length + 1)
  for (const { padrao, motivo } of PROIBIDOS) {
    if (padrao.test(conteudo)) {
      problemas.push(`${motivo} encontrado em ${relativo}`)
      achados++
    }
  }
  for (const jwt of conteudo.match(JWT) ?? []) {
    if (ehChaveSecreta(jwt)) {
      problemas.push(`chave SECRETA do Supabase (JWT "service_role") encontrada em ${relativo}`)
      achados++
      break
    }
  }
}
if (!achados) certos.push(`nenhuma credencial de exemplo nem dado de pessoa real nos ${textoChecados.length} arquivos do pacote`)

/* ------------------------------------------------------------------ */
/* 4) estrutura do pacote                                              */
/* ------------------------------------------------------------------ */

const tem = (nome) => existsSync(join(pasta, nome))

if (tem('index.html')) {
  const html = await readFile(join(pasta, 'index.html'), 'utf8')
  const assets = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => m[1])
  const faltando = assets.filter((a) => !existsSync(join(pasta, a)))
  if (faltando.length) problemas.push(`index.html aponta para arquivos que não existem: ${faltando.join(', ')}`)
  else certos.push(`index.html aponta para ${assets.length} arquivo(s) que existem na pasta assets/`)
  if (html.includes('<div id="root">')) certos.push('index.html tem o ponto de montagem do sistema')
  else problemas.push('index.html sem o <div id="root"> (a tela abriria em branco)')
} else if (pasta === publicar) {
  problemas.push('a pasta publicar/ está sem o index.html')
}

if (pasta === publicar) {
  if (tem('_redirects')) certos.push('_redirects presente (qualquer endereço abre o sistema)')
  else avisos.push('sem _redirects: endereços digitados na mão (ex.: /pedidos) podem dar 404 no Netlify')

  if (tem('LEIA-ME.txt')) {
    const leia = await readFile(join(pasta, 'LEIA-ME.txt'), 'utf8')
    if (/usuario:\s*gui|senha:\s*12345/i.test(leia)) problemas.push('o LEIA-ME.txt ainda divulga o acesso de exemplo (gui/12345)')
    else certos.push('LEIA-ME.txt sem acesso de exemplo')
    if (leia.includes(pacote.version)) certos.push(`LEIA-ME.txt fala da versão ${pacote.version}`)
    else avisos.push(`o LEIA-ME.txt não cita a versão atual (${pacote.version})`)
    if (leia.includes('#/administracao')) certos.push('LEIA-ME.txt ensina a porta do proprietário (#/administracao)')
    else avisos.push('o LEIA-ME.txt não ensina como criar o acesso do proprietário')
  } else {
    avisos.push('sem LEIA-ME.txt na pasta publicar/')
  }

  if (tem('Altoprints.html')) {
    const unico = await readFile(join(pasta, 'Altoprints.html'), 'utf8')
    if (/(src|href)="\.\/assets\//.test(unico)) problemas.push('Altoprints.html ainda depende da pasta assets (abriria em branco)')
    else certos.push('Altoprints.html é um arquivo único (abre com dois cliques)')
  } else {
    avisos.push('sem Altoprints.html (o arquivo que abre com dois cliques, sem servidor)')
  }
}

/* ------------------------------------------------------------------ */
/* resultado                                                           */
/* ------------------------------------------------------------------ */

for (const c of certos) console.log(`  ✅ ${c}`)
for (const a of avisos) console.log(`  ⚠️  ${a}`)
for (const p of problemas) console.log(`  ❌ ${p}`)

if (problemas.length) {
  console.log(`\n❌ O pacote NÃO pode ir para o ar: ${problemas.length} problema(s).`)
  console.log('   Corrija e rode de novo "npm run publicar".\n')
  process.exit(1)
}

console.log(`\n✅ Pacote liberado para publicar (versão ${pacote.version}).`)
console.log('   Próximo passo: https://app.netlify.com/drop → arraste a pasta publicar/ → Claim site.')
console.log('   Guia curto: LANCAMENTO.md (raiz do repositório).\n')
