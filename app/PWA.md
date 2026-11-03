# Instalar o Altoprints como aplicativo (PWA)

O Altoprints pode ser instalado pelo navegador no celular ou computador. Ele ganha um
ícone na tela inicial/área de aplicativos e abre em uma janela própria, sem precisar
redigitar o endereço.

## Marca e ícone

O ícone do aplicativo usa somente o símbolo colorido da Altoprints, sem o nome ou o slogan,
para continuar reconhecível em tamanhos pequenos. A marca completa em alta resolução está em
`app/public/brand/altoprints-logo-completo.png` (PNG) e `app/public/brand/altoprints-logo-completo.svg`;
a arte do símbolo gerada para a reconstrução está em `app/public/brand/altoprints-simbolo.png`.

## Antes de instalar

- Abra o endereço hospedado por HTTPS, por exemplo:
  <https://yuuv1.github.io/projeto-comiss-o-altoprints/>.
- A instalação não funciona pelo arquivo local `publicar/Altoprints.html` nem por
  `file://`; esse arquivo continua sendo apenas uma demonstração de um clique.
- Na primeira abertura, conecte à internet para o navegador baixar o aplicativo.

## Android (Chrome)

1. Abra o endereço do Altoprints no Chrome.
2. Toque em **Instalar app** dentro do sistema. Se o navegador mostrar a confirmação,
   toque em **Instalar**.
3. Se o botão não abrir a confirmação: menu **⋮ → Instalar app** ou
   **Adicionar à tela inicial** → **Instalar**.

## iPhone ou iPad (Safari)

1. Abra o endereço no **Safari**.
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início** e confirme em **Adicionar**.

O iOS não mostra o mesmo aviso automático de instalação do Android; o Altoprints mostra
as instruções quando você toca em **Instalar app**.

## Computador (Chrome ou Edge)

Use o botão **Instalar app** no Altoprints ou o ícone de instalação na barra de endereço.
Também é possível abrir o menu do navegador e escolher **Instalar Altoprints**.

## Atualizações e funcionamento sem internet

- O aplicativo verifica atualizações automaticamente. Quando uma nova versão do site é
  publicada, o PWA baixa os arquivos novos e atualiza a aplicação.
- A instalação guarda o **programa** para abrir mais rápido e oferecer a estrutura básica
  sem rede. Pedidos, clientes, login e alterações no Supabase precisam de internet para
  carregar e sincronizar; o service worker não guarda respostas do banco no cache offline.
- A instalação é por aparelho. Depois de instalar, confira em **Configurações → Nuvem**
  se aquele aparelho está conectado ao banco da empresa. Se o site for publicado com as
  variáveis do Supabase no workflow do GitHub, cada instalação já abre com a conexão
  configurada.

Para remover, desinstale o Altoprints pela tela inicial/lista de aplicativos do aparelho,
como qualquer outro app. O PWA não passa pela Play Store ou App Store.
