/**
 * Gera a pasta ../publicar com o site prontinho para jogar no Netlify Drop.
 *
 * Uso:  npm run publicar
 *
 * A pasta sai com:
 *   index.html, assets/...   (o site compilado)
 *   _redirects               (regra do Netlify para o sistema funcionar em qualquer endereço)
 *   LEIA-ME.txt              (passo a passo de como subir)
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const app = resolve(aqui, '..')
const destino = resolve(app, '..', 'publicar')

console.log('\n➡️  Compilando o site...\n')
const r = spawnSync('npx', ['vite', 'build'], { cwd: app, stdio: 'inherit', shell: process.platform === 'win32' })
if (r.status !== 0) process.exit(r.status ?? 1)

console.log('\n➡️  Montando a pasta "publicar"...\n')
await rm(destino, { recursive: true, force: true })
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
    `Altoprints — Sistema de Pedidos DTF  (versão ${pacote.version})`,
    '',
    'COMO PUBLICAR (Netlify Drop):',
    '  1. Abra https://app.netlify.com/drop',
    '  2. Arraste ESTA PASTA inteira (a pasta "publicar") para a área pontilhada',
    '  3. Espere o "Deploy" terminar e clique em CLAIM SITE (reivindicar) para o site virar seu',
    '  4. Pronto: o endereço aparece no topo da página',
    '',
    'COMO ATUALIZAR DEPOIS:',
    '  - Rode de novo:  npm run publicar',
    '  - Arraste a pasta "publicar" de novo na página do site (Deploys → Drag and drop)',
    '',
    'ACESSO DO PROPRIETÁRIO:',
    '  - Endereço:   .../#/administracao   (salve na tela de início do celular)',
    '  - Alternativa: 5 toques no logo, ou Ctrl + Alt + D no computador',
    '  - Na primeira vez, essa tela cria o acesso do proprietário.',
    '',
    'IMPORTANTE:',
    '  - Sem o Supabase configurado, os dados ficam salvos no navegador de cada aparelho.',
    '  - Para a equipe ver os mesmos pedidos, conecte o Supabase (veja app/DEPLOY.md).',
    '',
  ].join('\n'),
)

console.log('✅ Pasta pronta:', destino)
console.log('   Arraste essa pasta em https://app.netlify.com/drop\n')
