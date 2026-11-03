/**
 * Gera a pasta ../publicar para hospedar o site online (Pages/Netlify Drop).
 *
 * Uso: npm run publicar
 *
 * A publicação oficial exige a URL e a chave pública do Supabase. O app não
 * produz arquivo para abrir por dois cliques nem uma versão com dados locais.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const app = resolve(aqui, '..')
const destino = resolve(app, '..', 'publicar')
const dist = resolve(app, 'dist')

const envPublicacao = {
  ...process.env,
  VITE_SUPABASE_URL:
    (process.env.VITE_SUPABASE_URL ?? '').trim() || 'https://eeurdquvrdmoyjgzgpac.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY:
    (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim() ||
    ((process.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
      ? ''
      : 'sb_publishable_ebcfV_dIMgKSe_d1SlX5aw_EBT3P1pS'),
}

// Remove qualquer saída anterior primeiro: se a configuração/build falhar,
// nada antigo fica disponível para ser arrastado ou publicado por engano.
await rm(destino, { recursive: true, force: true })
await rm(dist, { recursive: true, force: true })

console.log('\n➡️  Validando a configuração central do Supabase...\n')
const validacaoConfig = spawnSync(process.execPath, [resolve(aqui, 'validar-config-supabase.mjs')], {
  cwd: app,
  env: envPublicacao,
  stdio: 'inherit',
})
if (validacaoConfig.status !== 0) process.exit(validacaoConfig.status ?? 1)

console.log('\n➡️  Compilando o site online...\n')
const r = spawnSync('npx', ['vite', 'build'], {
  cwd: app,
  env: envPublicacao,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (r.status !== 0) process.exit(r.status ?? 1)

console.log('\n➡️  Validando a conexão central e o pacote de produção...\n')
const checagemDist = spawnSync(process.execPath, [resolve(aqui, 'checar-publicacao.mjs'), 'dist'], {
  cwd: app,
  stdio: 'inherit',
})
if (checagemDist.status !== 0) {
  await rm(destino, { recursive: true, force: true })
  console.log('❌ Publicação cancelada. O site exige a conexão central com o Supabase.\n')
  process.exit(checagemDist.status ?? 1)
}

console.log('\n➡️  Montando a pasta "publicar"...\n')
await mkdir(destino, { recursive: true })
await cp(resolve(app, 'dist'), destino, { recursive: true })
await writeFile(
  resolve(destino, '_redirects'),
  '# mantém o endereço funcionando em qualquer caminho (SPA)\n/*  /index.html  200\n',
)

const pacote = JSON.parse(await readFile(resolve(app, 'package.json'), 'utf8'))
await writeFile(
  resolve(destino, 'LEIA-ME.txt'),
  [
    `Altoprints — Sistema de Pedidos DTF (versão ${pacote.version})`,
    '',
    'SITE OFICIAL — SOMENTE ONLINE:',
    '  - O sistema usa um único banco Supabase configurado durante a publicação.',
    '  - Todos os aparelhos abrem os mesmos pedidos, clientes e acessos.',
    '  - O pacote não funciona como arquivo offline e não grava dados operacionais no navegador.',
    '  - A chave incluída no app é pública (publishable/anon); nunca use sb_secret/service_role.',
    '',
    'PUBLICAR NO NETLIFY DROP:',
    '  1. Abra https://app.netlify.com/drop.',
    '  2. Arraste esta pasta inteira e aguarde o deploy.',
    '  3. Clique em Claim site para manter o endereço.',
    '  4. Todos devem usar o mesmo endereço oficial.',
    '',
    'INSTALAR COMO APLICATIVO (PWA):',
    '  - Abra o endereço publicado em HTTPS no celular ou computador.',
    '  - Android: Chrome → Instalar app. iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início.',
    '  - O aplicativo atualiza sozinho e precisa de internet para ler/gravar dados.',
    '',
    'PRIMEIRO ACESSO:',
    '  - O sistema começa sem pedidos de exemplo e sem senha padrão.',
    '  - O proprietário cria o primeiro acesso em Login proprietário (ou #/administracao).',
    '  - A equipe registra as filas no mesmo banco online, sem contas individuais.',
    '',
    'COMO ATUALIZAR:',
    '  - Gere novo pacote com npm run publicar ou envie a alteração para a main.',
    '  - O PWA instalado recebe a atualização automaticamente ao ficar online.',
    '',
    'Nunca limpe os dados do navegador para atualizar. A conexão oficial é central e não é configurada aparelho por aparelho.',
    '',
  ].join('\n'),
)

console.log('\n➡️  Conferindo o pacote final...')
const checagem = spawnSync(process.execPath, [resolve(aqui, 'checar-publicacao.mjs')], {
  cwd: app,
  stdio: 'inherit',
})
if (checagem.status !== 0) {
  await rm(destino, { recursive: true, force: true })
  console.log('❌ Publicação cancelada: resolva os problemas acima e rode de novo.\n')
  process.exit(checagem.status ?? 1)
}

console.log('✅ Pacote online pronto:', destino)
console.log('   Arraste a pasta em https://app.netlify.com/drop\n')
