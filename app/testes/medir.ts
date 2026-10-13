// Script temporário: mede o tamanho dos dados de exemplo (apagado depois)
import { gerarDadosDemo } from '../src/lib/seed'

const demo = gerarDadosDemo()
const json = JSON.stringify(demo)
console.log('pedidos:', demo.pedidos.length)
console.log('clientes:', demo.clientes.length)
console.log('impressoes:', demo.impressoes.length)
console.log('JSON:', json.length, 'caracteres =', (json.length / 1024).toFixed(1), 'KB')
console.log('no localStorage (UTF-16, x2):', ((json.length * 2) / 1024 / 1024).toFixed(2), 'MB')
