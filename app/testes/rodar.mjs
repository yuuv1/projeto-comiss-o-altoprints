/**
 * Roda os testes do sistema: regras de negócio (sempre) e interface (se o jsdom estiver instalado).
 * Uso:  npm run testar
 */
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = resolve(aqui, '..')

/** faz o esbuild entender as importações "?raw" do Vite (usadas para embutir o SQL) */
const pluginBruto = {
  name: 'texto-bruto',
  setup(construir) {
    construir.onResolve({ filter: /\?raw$/ }, (args) => ({
      path: resolve(dirname(args.importer), args.path.replace(/\?raw$/, '')),
      namespace: 'bruto',
    }))
    construir.onLoad({ filter: /.*/, namespace: 'bruto' }, async (args) => ({
      contents: await readFile(args.path, 'utf8'),
      loader: 'text',
    }))
  },
}

async function compilar(entrada, saida) {
  await build({
    plugins: [pluginBruto],
    entryPoints: [resolve(aqui, entrada)],
    outfile: resolve(raiz, 'node_modules/.cache', saida),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    loader: { '.css': 'empty' },
    external: ['jsdom'],
    define: { 'import.meta.env': '{}' },
    logLevel: 'error',
  })
  return resolve(raiz, 'node_modules/.cache', saida)
}

function executar(arquivo) {
  const r = spawnSync(process.execPath, [arquivo], { stdio: 'inherit', cwd: raiz })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

console.log('\n➡️  Regras de negócio (preços, datas, formatação, dados de exemplo)\n')
executar(await compilar('regras.ts', 'regras.cjs'))

if (existsSync(resolve(raiz, 'node_modules/jsdom'))) {
  console.log('\n➡️  Login, perfis e permissões\n')
  executar(await compilar('login.tsx', 'login.cjs'))

  console.log('\n➡️  Interface (renderização de todas as telas)\n')
  executar(await compilar('smoke-ui.tsx', 'smoke-ui.cjs'))
} else {
  console.log('\nℹ️  Teste de interface ignorado (instale o jsdom com: npm i -D jsdom)\n')
}
