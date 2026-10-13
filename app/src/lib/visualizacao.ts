/**
 * Modo "ver como funcionário".
 *
 * O proprietário pode abrir o sistema com os olhos de um acesso da equipe, para
 * conferir exatamente o que a pessoa vê (menu, telas liberadas, valores
 * escondidos). Nesse modo o sistema fica só para olhar: qualquer tentativa de
 * salvar avisa que é preciso sair do modo antes.
 *
 * A marca fica neste módulo (e não no estado do React) para que a camada de
 * dados — que não conhece o login — também consiga bloquear as gravações.
 */

let visualizandoId: string | null = null

/** liga/desliga o modo (o auth chama isto ao entrar e ao sair) */
export const definirVisualizacao = (id: string | null) => {
  visualizandoId = id
}

export const emVisualizacao = () => visualizandoId !== null

export const idVisualizado = () => visualizandoId

export const MENSAGEM_SO_VISUALIZACAO =
  'Você está no modo “ver como funcionário” (só visualização). Para alterar os dados, volte ao seu acesso no botão do topo da tela.'

/**
 * Quem avisa na tela quando alguém tenta salvar no modo visualização.
 * O store registra a função de aviso (toast) para que a tentativa não passe
 * em branco — a pessoa vê o recado e o botão de voltar ao próprio acesso.
 */
let avisarNaTela: ((texto: string) => void) | null = null

export const registrarAvisoDeBloqueio = (fn: ((texto: string) => void) | null) => {
  avisarNaTela = fn
}

/** usado por toda gravação: no modo visualização, nada é salvo */
export function bloquearSeVisualizando() {
  if (!emVisualizacao()) return
  avisarNaTela?.(MENSAGEM_SO_VISUALIZACAO)
  throw new Error(MENSAGEM_SO_VISUALIZACAO)
}

/** rótulo curto do modo, usado na faixa do topo */
export const rotuloVisualizacao = (nome: string, papel: string) =>
  `Você está vendo o sistema como ${nome} (${papel}) — é exatamente o que essa pessoa vê. Só para conferir: nada será salvo.`
