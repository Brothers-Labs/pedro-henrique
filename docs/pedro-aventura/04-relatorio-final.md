# Pedro Aventura: Temporada do Pedro 3D — Relatório final

Data: 14/10/2026 · Repositório: `Brothers-Labs/pedro-henrique` · Branch: `staging`

Documentos: [análise](01-analise.md) · [prompt mestre](02-prompt-mestre.md) · [plano](03-plano-de-desenvolvimento.md) · [fila](CLAUDE_QUEUE.md)

---

## 1. Resumo

O jogo **Temporada do Pedro 3D** fica em `/pedro-aventura` e abre em tela cheia, separado do resto do site. Ele é jogável no navegador, no computador e no celular:

- **Lobby 3D:** o Pedro e o cachorro Rex no pódio, mansão, carro e céu estrelado.
- **Mapa 3D:** seis regiões e 28 fases geradas a partir de dados.
- **Corrida 3D em terceira pessoa:** física real, obstáculos, vidas, checkpoints, objetivos, vitória e derrota.
- **Progressão completa:** missões diárias, semanais, de temporada e especiais; passe de 20 níveis com faixas Gratuito, VIP e Luxo; loja; personagem; ranking pessoal; configurações.
- **Salvamento:** todo o progresso fica no aparelho.

O site antigo (Pedro Maker, Kart, Flash, Aventura, mascote, prancha de falar) **não mudou**. Os únicos pontos tocados fora da pasta do jogo são estes três:

- a rota nova em `app.routes.ts`;
- o modo tela cheia em `app.ts`, `app.html` e `app.scss`;
- a seção nova no `README.md`.

## 2. Ficha da demanda

| Campo | Valor |
| --- | --- |
| DEMANDA | Pedro Aventura: Temporada do Pedro 3D (AV-001 a AV-011) |
| STATUS | Marcos 1 a 5 concluídos. Marco 6: AV-012, AV-013 e AV-014 BLOCKED; AV-015 PENDING |
| OBJETIVO | Transformar os quatro mocks num jogo 3D real e persistente, numa rota separada |
| AGENTES UTILIZADOS | Orquestrador (implementação e integração). Subagente de exploração (mapeamento do repositório). Subagente de revisão de código e segurança (somente leitura) |
| BRANCH | `staging` |
| COMMIT | ver a seção 8 |
| GITHUB ACTIONS | Não aplicável: o repositório não tem workflows (`.github` inexistente) |
| STAGING | Push para `origin/staging` (ver a seção 8) |

## 3. O que foi entregue, por mock

### 3.1 Lobby (mock 1)

| Elemento do mock | Entregue |
| --- | --- |
| Pedro e cachorro em 3D | Pedro (moletom da coroa, óculos escuros, cordão, tênis) e Rex (dobermann de coleira dourada), animados parados: respiração, olhar em volta e rabo abanando |
| Cenário premium e câmera | Pódio dourado com aro de neon, luz de palco, mansão com janelas acesas, piscina, palmeiras, cordão de luzes, estrelas e carro escolhido. A câmera passeia devagar, e fica parada com movimento reduzido |
| Nível, XP, moedas e diamantes | Selo de nível com barra de XP; carteira na barra superior |
| Contagem da temporada | "Acaba em 49d 1h 44m", atualizada a cada minuto, com texto por extenso para leitor de tela |
| Missões diárias | As 4 diárias com progresso, recompensa e resgate |
| Evento especial | Corrida Noturna, com o estado real (aberto, trancado com a condição, ou encerrado) |
| Jogar agora e Explorar mapa | "Jogar agora" leva direto à primeira fase aberta e ainda não vencida |
| Passes, loja, ranking, personagem, configurações | Todos levam a telas funcionais |

### 3.2 Mapa (mock 2)

- **Seis ilhas 3D** no oceano, cada uma com a cor e o marco da sua região: palmeiras, prédios, montanhas nevadas, torres de neon, dunas e pilares de neon.
- **Estado de cada ilha:** trancada (cinza), aberta, ou selecionada (anel dourado).
- **Escolha:** toque ou clique na ilha.
- **Rótulos:** posicionados sobre as ilhas a cada quadro, direto no estilo do elemento, sem acionar a detecção de mudanças do Angular.
- **Acessibilidade:** a faixa de cartões das regiões faz o mesmo pelo teclado, e a lista de fases mostra estrelas, recorde e o botão Jogar.
- **Desbloqueio orientado a dados:**
  - 8 estrelas numa região abrem a próxima;
  - as fases abrem em sequência;
  - o evento abre só na janela da temporada e com a Ilha Inicial vencida.
- **Próxima recompensa:** cartão com o prêmio do nível seguinte do passe.

### 3.3 Gameplay (mock 3)

- **Corrida em terceira pessoa, em três faixas:**
  - trocar de faixa, pular, derrapar (passa por baixo de barras) e atacar (quebra caixas);
  - rampas que lançam o Pedro e contam para as missões.
- **Obstáculos:**
  - barreira, barra alta, caixa e cone;
  - carro parado;
  - carro andando na contramão;
  - barreira que varre as faixas.
- **Coletáveis:** moedas (com arco sobre as rampas), corações (+1 vida) e três coroas por fase.
- **Vidas e derrota:**
  - 3 corações, com invencibilidade curta depois de cada batida;
  - checkpoints a 1/3 e 2/3 da pista;
  - na derrota, a criança escolhe entre "Continuar do checkpoint" e "Recomeçar".
- **Painel:** fase, corações, cronômetro com centésimos, coroas, moedas e barra de percurso.
- **Objetivos da fase:** completar o percurso, a meta de moedas, a meta de rampas e o tempo-alvo. As estrelas saem deles.
- **Estados formais:** `loading → ready → playing ⇄ paused → victory | defeat`, mais `error`. A contagem 3-2-1 mostra a dica do tutorial.
- **Controles:**

  | Ação | Teclado | Toque / gesto | Controle de videogame |
  | --- | --- | --- | --- |
  | Trocar de faixa | setas ou A/D | botões de toque ou deslizar | direcional ou analógico |
  | Pular | Espaço ou W | botão de toque ou deslizar | A |
  | Derrapar | S | botão de toque ou deslizar | B |
  | Atacar | E ou F | botão de toque | X |
  | Pausar | Esc | — | Start |

  Os botões de toque aparecem sozinhos em telas de toque, ou conforme a configuração.
- **Resultado:** estrelas, objetivos, tempo, moedas, XP, diamantes, novo recorde, nível do passe, região nova liberada e missões completas. Depois, "Próxima fase", "Jogar de novo" ou "Mapa".
- **O Rex corre ao lado:** ele pula junto com o Pedro, com um atraso de cachorro.

### 3.4 Passe de temporada (mock 4)

- **Trilha:** 20 níveis × 3 faixas, paginados de 5 em 5 para caber no celular.
- **Estado de cada prêmio:** resgatado, pronto, trancado por nível ou trancado por passe.
- **Resgate:** um por vez ou "Resgatar tudo".
- **Comprar nível:** 100 💎, com confirmação.
- **Passes VIP e Luxo:** saem por 199 💎 e 490 💎, com confirmação.
  - O Luxo inclui o VIP; quem já tem o VIP paga só a diferença.
  - Os prêmios dos níveis já alcançados ficam liberados na hora.
- **Destaques do Luxo:** Pedro Elite (nível 20), Lambo Gold (nível 10) e Rex Gold (nível 5).
- **Baús:** o conteúdo é fixo e aparece antes de abrir. Não é loot box.

## 4. Arquitetura

O resumo está abaixo; o detalhe, no [plano](03-plano-de-desenvolvimento.md#2-arquitetura).

| Camada | Pasta | Testada sem navegador 3D |
| --- | --- | --- |
| Dados de design | `config/` | sim (validação nas specs) |
| Regras da economia e da progressão | `rules/` | sim |
| Gerador e simulação da corrida | `simulation/` | sim (inclui piloto automático) |
| Estado, persistência e áudio | `services/` | estado e persistência, sim |
| Motor 3D (three.js) | `engine/` | verificado em navegador real (seção 6) |
| Interface | `shell/`, `components/`, `pages/` | verificado em navegador real |

**Decisões que valem destacar:**

- **Three.js, não Babylon.js:** o projeto já usa o three.js, carregado sob demanda.
- **Sem arquivos de terceiros:** modelos, texturas e áudio são feitos em código.
- **Passes sem dinheiro real:** os preços em reais ficam só na configuração, com `IS_REAL_PAYMENT_ENABLED = false`.
- **Economia preparada para o servidor:** idempotente por id de lançamento e validada contra a própria pista, que é determinística.
- **Ranking honesto:** mostra só recordes reais do aparelho, e diz que o ranking entre jogadores depende de servidor.

## 5. Testes e verificações executados

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Build de produção | `npm run build` (`ng build`) | Passou. Pacote inicial de 433,7 kB (128,7 kB comprimido), dentro do limite de 600 kB. O jogo e o three.js vão em chunks lazy |
| Testes unitários e de integração | `npx ng test --watch=false --browsers=ChromeHeadless` | **914 de 914 com sucesso**: 736 já existentes e 178 novos |
| Avisos de Sass | `ng build --verbose` | Nenhum aviso novo. Os avisos de RegExp vêm do `auth-form.ts`, que já existia |
| Textos em pt-BR | varredura de palavras sem acento nas telas | Sem ocorrências em texto visível. Os acertos foram só ids e rotas (`missoes`, `configuracoes`, `regiao`) |
| Navegador real | Chrome sem janela via protocolo de depuração (CDP), WebGL em SwiftShader, em 1600×900 e 390×844 | Lobby, mapa, passe e fase renderizam. Na fase foram feitos pulo, troca de faixa, coleta de moedas e derrota com o diálogo. Sem erro no console. Sem rolagem lateral no celular |
| E2E com Playwright | — | **Não executado.** É dependência nova e precisa de aprovação (AV-014) |
| ESLint | — | **Não existe** no projeto |
| verify e vtest | — | **Não existem** no `package.json` |
| GitHub Actions | — | **Não existe** workflow no repositório (AV-013) |

**O que os testes novos cobrem:**

- Carteira: idempotência, tudo-ou-nada, saldo negativo recusado, histórico limitado.
- Campanha: estrelas, recordes, desbloqueio de fase, de região e do evento.
- Missões: progresso, recomeço diário e semanal, resgate único.
- Passe: níveis, elegibilidade, resgate duplicado recusado, VIP→Luxo pela diferença, liberação retroativa.
- Partida aplicada: moedas, XP, missões, resultado repetido recusado, resultado adulterado recusado (moedas a mais, tempo impossível, fase trancada), pontuação recalculada, derrota.
- Saneamento: dado corrompido ou parcial.
- Gerador: determinismo; passagem garantida e metas alcançáveis nas 28 fases.
- Simulação: estados, pulo, troca de faixa, batida, pulo da barreira, derrapada sob a barra, ataque, coleta, rampa, vitória, derrota e checkpoint.
- Piloto automático: vence as 10 fases da Ilha e da Montanha.
- Store: a jornada inteira (vitória → XP → missão → resgate → recarregar → progresso preservado), falha de gravação e apagar progresso.
- Formatos: números, cronômetro e contagem regressiva.
- Modo tela cheia do `App`: liga nas rotas do jogo e desliga ao voltar para o site.

## 6. Problemas encontrados na verificação em navegador e corrigidos

| Problema | Correção |
| --- | --- |
| "Esquerda" levava o Pedro para a direita: com a câmera olhando para +z, o x positivo fica à esquerda da tela | `laneX` com sinal invertido, documentado em `simulation/track.model.ts` |
| O diálogo de derrota aparecia no canto superior esquerdo: o reset de margem do site anulava a centralização do `<dialog>` | `margin: auto` no mixin de diálogo |
| O Pedro e o Rex eram silhuetas no lobby | Luz de palco (spot), luz de contorno azul e luz de preenchimento |
| Títulos herdavam a cor escura do site | Cor explícita nos títulos do jogo |
| A página passava 9 px da largura no celular | A faixa de abas, como item de grid, ganhava a largura do conteúdo: `min-width: 0` resolveu |
| O botão Pular saía da tela no celular, e os objetivos cobriam o cronômetro | Botões menores em telas de até 480 px; objetivos recolhidos no celular |
| Ilhas pequenas, ilhas trancadas pretas e anel de seleção escondido no mapa | Câmera mais perto, cinza claro nas trancadas, anel maior |
| Erro de compilação (`rim` declarado duas vezes) | Variável renomeada |

### 6.1 Revisão de código e segurança (subagente, somente leitura)

Não houve achado P0 nem P1. Foram 5 achados P2 e 10 P3, todos corrigidos nesta entrega:

| Gravidade | Achado | Correção |
| --- | --- | --- |
| P2 | Música da corrida não voltava em "Próxima fase" ou "Jogar de novo" | `playMusic` da mesma trilha retoma a música pausada |
| P2 | A corrida largava com a aba escondida durante a contagem | Contagem para quando a aba some e recomeça quando ela volta |
| P2 | Lobby e mapa congelavam se o WebGL caísse com a aba escondida | Ao recuperar o contexto com a aba visível, a cena retoma |
| P2 | Duas sessões abertas ao mudar de fase durante o carregamento (rede lenta) | Número de geração: a abertura atrasada é descartada |
| P2 | Tela presa em "Preparando a pista…" depois de abrir uma fase trancada | O efeito acompanha toda mudança de fase, não só depois da primeira abertura |
| P3 | Compra com id de lançamento já usado passaria de graça | Passe, níveis e loja recusam id já aplicado |
| P3 | Resultado aceitava pontuação da tela, tempo impossível e fase trancada | Pontuação recalculada na regra; tempo mínimo e desbloqueio conferidos |
| P3 | Fase podia "trancar" no meio da corrida quando o evento acabava | Desbloqueio conferido só quando a fase muda |
| P3 | Lobby remontava o Pedro a cada resgate | Comparação do visual pelos ids |
| P3 | Canvas e contexto WebGL vazavam se a cena falhasse ao montar | `stage.dispose()` no erro de montagem |
| P3 | Caixa atropelada continuava desenhada | A batida na caixa também emite `break` |
| P3 | Teleporte para o chão ao sair da rampa pelo lado | O Pedro cai com gravidade |
| P3 | Moldura do site piscava ao abrir o jogo direto pela URL | Tela cheia decidida no `RoutesRecognized` |
| P3 | Saneamento aceitava qualquer chave em `seasons` | Padrão de id, limite de quantidade e objeto sem protótipo |
| P3 | Derrota não era guardada ao sair pela seta do navegador, e a cena seguia desenhando atrás do diálogo | Derrota guardada no `onDestroy`; cena pausada 1,5 s depois do fim |

## 7. Arquivos alterados

**Fora da pasta do jogo:**

- `src/app/app.ts`, `src/app/app.html`, `src/app/app.scss`: modo tela cheia por `data.immersive`.
- `src/app/app.spec.ts` (novo).
- `src/app/app.routes.ts`: rota `pedro-aventura`.
- `README.md`: seção do jogo.

**Pasta do jogo, `src/app/features/pedro-aventura/` (novos):** 90 arquivos, com cerca de 8.300 linhas de TypeScript de produção, mais templates, estilos e specs. Ficam em:

- `config/`, `models/`, `rules/` e `simulation/`;
- `engine/`, `services/`, `shell/`, `components/` e `pages/`.

**Documentação, `docs/pedro-aventura/` (novos):**

- `01-analise.md`;
- `02-prompt-mestre.md`;
- `03-plano-de-desenvolvimento.md`;
- `04-relatorio-final.md`;
- `CLAUDE_QUEUE.md`.

**Trabalho anterior guardado:** a primeira versão da Temporada era integrada aos jogos do site e mexia no Maker, no Kart, no Flash e no mascote. Ela foi substituída por este jogo separado, a pedido. Está guardada, sem perda, em `git stash` com a mensagem "wip: temporada integrada ao site (substituida pelo jogo separado /pedro-aventura)". Ela não entrou no commit.

## 8. Git e publicação

O commit vai para a `staging`, já atualizada com `origin/staging`, e o push segue o fluxo do projeto (`--no-verify`). O hash do commit e o resultado do push ficam na mensagem de entrega e no `git log`.

O repositório não tem GitHub Actions, então não há CI para acompanhar. O deploy de staging na Vercel depende da integração do repositório com a Vercel, e não foi verificado daqui.

## 9. Riscos e pendências

| ID | Item | Situação | Motivo / ação necessária |
| --- | --- | --- | --- |
| AV-012 | Backend (API, banco, autenticação, economia validada no servidor) | BLOCKED | Não existe servidor. As regras de `rules/` já são puras e idempotentes, prontas para rodar num servidor. Precisa decidir a infraestrutura (Node + PostgreSQL) |
| AV-013 | GitHub Actions | BLOCKED | O repositório não tem workflows. Precisa de aprovação, porque afeta o site inteiro |
| AV-014 | Playwright E2E e ESLint | BLOCKED | Dependências novas; precisam de aprovação. Até lá, a jornada é coberta pela spec de integração do store e pela verificação manual via CDP |
| AV-015 | Benchmarks de FPS em aparelho real | PENDING | As metas (60 FPS no desktop, 30 FPS no tablet) **não foram medidas**. A verificação foi feita em SwiftShader (render por software), que não serve para medir desempenho |
| — | Economia validada só no aparelho | Risco aceito | Dá para editar o `localStorage`. Não há dinheiro nem disputa entre jogadores; o saneamento e a conferência contra a pista limitam o estrago |
| — | Itens dos mocks fora desta entrega | P2 | Minimapa da fase; telas próprias de Conquistas e Eventos; emotes; helicóptero e iate decorativos. Estão listados como próximas evoluções |

## 10. Próximas evoluções sugeridas (por prioridade)

1. **P1:** medir FPS num tablet de referência e ajustar a qualidade automática (AV-015).
2. **P1:** aprovar o Playwright e escrever o smoke da jornada (Lobby → Mapa → Fase → Vitória → Missão → Recompensa → Persistência) (AV-014).
3. **P2:** minimapa e partículas de velocidade na fase; tela de Conquistas com medalhas por região.
4. **P2:** backend com a mesma camada `rules/` rodando no servidor, para ranking real entre jogadores (AV-012).
5. **P3:** mais cosméticos (helicóptero e iate no lobby), emotes de vitória e uma segunda temporada.

## 11. Evolução 2 (14/10/2026): dificuldade e realismo visual

Pedido depois da primeira entrega publicada: deixar o personagem, o rosto e o cenário do lobby mais
realistas ("tudo muito quadrado") e criar os modos Fácil, Médio e Difícil, mantendo o Fácil como o
jogo atual.

### 11.1 Dificuldade (AV-016)

| Modo | Velocidade | Obstáculos | Corações | Invencibilidade após batida | XP |
| --- | --- | --- | --- | --- | --- |
| 🐢 Fácil | o jogo original | densidade da fase | 3 | 1,5 s | ×1 |
| 🐇 Médio | +15% | densidade +0,12 | 3 | 1,2 s | ×1,25 |
| 🐆 Difícil | +30% | densidade +0,22 | 2 | 1,0 s | ×1,5 |

- **Fácil sem mudança:** o Fácil usa a mesma semente de antes, então as pistas de sempre continuam
  idênticas (há um teste para isso).
- **Pista própria por modo:** Médio e Difícil têm cada um sua pista determinística.
- **Onde escolher:** o seletor fica no lobby, no mapa e nas configurações, e a escolha é salva no
  aparelho. A fase registra a dificuldade com que começou: trocar no meio não muda a corrida.
- **Validação do resultado:** o resultado leva a dificuldade junto. A conferência contra a pista usa a
  pista daquela dificuldade, e o tempo mínimo usa a velocidade daquela dificuldade.
- **Testes:** passagem e metas conferidas nas 28 fases × 3 modos; velocidade e corações por modo;
  multiplicador de XP.

### 11.2 Realismo visual (AV-017)

- **Pedro:**
  - corpo de formas arredondadas (cápsulas e caixas de canto arredondado);
  - moletom com capuz e cordões, calça jogger e tênis com sola e detalhe;
  - rosto: crânio oval, orelhas, olhos com íris e brilho, sobrancelhas, nariz, boca, bigode, barba
    cheia e cabelo com fade e topete.
- **Rex:** corpo atlético, focinho comprido, orelhas em pé, olhos e as marcas cor de canela do
  dobermann.
- **Carros:** carroceria e cabine arredondadas, rodas com aro metálico.
- **Lobby:**
  - piso de mármore polido, com reflexo do ambiente na qualidade média e alta;
  - mansão moderna de dois pavimentos, com vidraças acesas, lajes em balanço, frisos de luz e sacada
    de vidro;
  - piscina com borda de pedra, cercas vivas e arbustos;
  - postes de jardim, lua e silhueta de cidade ao fundo.
- **Palmeiras novas, valendo no lobby, na pista e no mapa:** tronco curvo em gomos, folhas compridas
  que caem com o peso e cocos.

### 11.3 Bug encontrado e corrigido na verificação

No mapa, as ilhas trancadas não ficavam cinza e o anel de seleção não aparecia.

- **Causa:** o efeito só lia `presence.phase()` depois de checar a sessão. Na primeira execução a
  sessão ainda é nula, então o efeito nunca passava a depender da fase.
- **Correção:** a fase é lida antes, no mapa e no palco do lobby.

### 11.4 Verificação

- **Testes:** `npx ng test --watch=false --browsers=ChromeHeadless`, com **1141 de 1141 passando**.
- **Build:** `npm run build` passou.
- **Navegador:** Chrome sem janela via CDP (lobby, personagem, fase no Fácil e no Difícil com 2
  corações, mapa). Nenhum erro no console.

## 12. Evolução 3 (15/10/2026): itens e perigos novos (AV-018)

| Elemento | Onde aparece | O que faz | Valor |
| --- | --- | --- | --- |
| 🪙 Moeda | fileiras entre obstáculos e arcos das rampas | — | 1 moeda |
| 🧈 Barra de ouro | fim de algumas fileiras de moedas (pelo menos 1 por fase) | — | 10 moedas |
| 💎 Diamante | 2 por fase, a 2,3 m de altura numa faixa livre | só pulando se alcança | 1 diamante |
| ⚡ Turbo | 1 por fase (2 nas fases de 700 m ou mais) | 3 s a 145% da velocidade, atravessando obstáculos | — |
| 🍌 Banana | fases da Ilha (a partir da 1-3), Zona Urbana, Montanha, Luxo, Deserto e evento | escorrega para outra faixa e perde velocidade por 0,8 s, sem perder coração; pulando passa | — |
| 🐾 Pato, gato e porquinho | 1-5 e fases seguintes de cada região | atravessam a pista de um lado a outro; bater tira coração | — |

- **Economia:**
  - a carteira recebe `moedas + barras × 10` e os diamantes pegos, em lançamentos idempotentes por tentativa;
  - a conferência do resultado recusa mais barras ou diamantes do que a pista tem;
  - a missão "Coletar 100 moedas" conta o valor (uma barra vale 10).
- **Pontuação:** barra de ouro vale 100 pontos e diamante, 300.
- **Tela:**
  - o painel da fase mostra 🧈 e 💎;
  - a contagem regressiva mostra uma legenda com o valor e o efeito de cada item;
  - cada item tem som e faíscas próprios;
  - o turbo abre a câmera e deixa um rastro azul (sem efeito com movimento reduzido);
  - o escorregão faz o Pedro rodopiar e anuncia "Escorregou na banana!".
- **Gerador:** bananas são obstáculos comuns, que podem ser puladas. Os bichos andam, então ficam sozinhos na fileira, como os carros e a barreira que varre. O Fácil mantém os obstáculos de sempre; os itens novos entram nos trechos livres.
- **Testes:**
  - turbo acelera e evita batida;
  - banana escorrega sem dano, e quem pula passa por cima;
  - barra e diamante são contados, e o diamante só vem pulando;
  - todas as 28 fases × 3 dificuldades têm barra, 2 diamantes no alto e turbo;
  - valores creditados na carteira e resultado adulterado recusado;
  - o piloto automático segue vencendo a Ilha e a Montanha com bananas e bichos.
- **Verificação:**
  - `npx ng test --watch=false --browsers=ChromeHeadless`: **1229 de 1229 passando**;
  - `npm run build`: passou;
  - fase 1-5 jogada no Chrome sem janela via CDP, sem erros no console.

