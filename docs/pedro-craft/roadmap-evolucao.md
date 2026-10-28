# PedroCraft — análise de melhorias e roteiro de evolução

- **Data:** 2026-10-27
- **Base:** estado da `staging` depois do M7 (commit `bb0d1f0`)
- **Quem usa:** o Pedro Henrique, criança autista, no tablet e no computador

Este documento faz duas coisas:

- reúne as ideias de evolução do PedroCraft, em ordem de prioridade;
- organiza essas ideias em fases que fazem o jogo crescer sem quebrar o que já funciona.

Cada fase cabe numa demanda própria, com o mesmo processo dos marcos M0 a M7.

## Situação das fases (atualizada em 2026-10-28)

| Fase | Situação | Marco |
| --- | --- | --- |
| Ajuda ❓ (pedido à parte) | Entregue | M8 |
| F0 — Firmar | Entregue, menos a conferência no tablet, que fica com o Pedro | M9 |
| F1 — Fazenda viva | Entregue: 6 plantações, comidas, adubo e filhotes (regador e diário ficaram para depois) | M10 |
| F2 — Calendário e estações | Entregue: calendário, 4 estações, clima, estufa (gelo no lago, arco-íris e aniversário ficaram para depois) | M11 |
| F3 — Modos de jogo | Entregue: Criativo, Aventura e Sobrevivência gentil | M12 |
| F4 — Noites mais justas | Entregue: armadura, escudo, dificuldade, aviso de anoitecer, Rei Slime, lanterna e fogueira | M13 |
| F5 a F8 | Não começadas | — |

---

## 1. Onde o jogo está hoje

Antes de propor, vale separar o que **já existe** do que é **novo**. Várias perguntas ("tem
sementes? tem plantação? tem inimigo à noite?") já têm resposta no jogo de hoje.

| Tema | Já existe hoje | Ainda não existe |
| --- | --- | --- |
| Sementes | Sementes de trigo (do capim, 20%), cenoura (do capim, 5%), muda de carvalho (das folhas, 12%) | Outras sementes, adubo, sementes raras |
| Plantação | Enxada, terra arada, trigo e cenoura em 4 estágios, muda que vira árvore, crescimento 2× com água a até 4 blocos | Mais plantas, estufa, irrigação automática, praga |
| Colheita | Trigo maduro dá trigo e sementes, cenoura madura dá 2 a 3 cenouras, planta verde devolve a semente | Ferramenta de colher em área, cesto, venda |
| Vida | 10 corações, a vida volta sozinha (1 a cada 5 s), comida cura, desmaiar devolve o herói para casa **com todos os itens** | Armadura, dificuldade, outros modos |
| Alimentação | Maçã, pão, cenoura, ovo frito, leite (cura de 2 a 5) | **Fome**: não existe, de propósito (regra RN04) |
| Inimigos noturnos | Espantalho que persegue, slime que se divide, aranha que pula, esqueleto que atira. Respeitam tochas, somem ao amanhecer, e o Modo Paz os desliga | Chefe, eventos, dificuldade, armadura |
| Tempo | Dia de 10 min e noite de 3 min, crepúsculo suave, cama que pula a noite | Relógio na tela, contagem de dias, **estações**, clima |
| Animais | Ovelha (tesoura dá lã), vaca (balde dá leite), galinha (bota ovo) | Filhotes, cercados, ração, cavalo |
| Mundo | 96 × 96 × 48 blocos por semente, salvo no aparelho, até 5 mundos | Mapa, cavernas, biomas, mundo maior |

**Números do conteúdo:**

- 33 blocos, 62 itens, 36 receitas de mesa e 6 de fornalha;
- 17 missões guiadas;
- 3 plantações (trigo, cenoura e carvalho);
- 1 fonte de luz (a tocha).

Quase tudo é dado em JSON: muita coisa nova nasce **sem escrever código**.

---

## 2. Como a prioridade foi decidida

Cada ideia recebeu nota em cinco critérios, nesta ordem:

1. **Valor para a criança.** Deixa o jogo mais claro, mais calmo ou mais divertido para o
   Pedro Henrique?
2. **Risco.** Pode assustar, frustrar ou confundir? Mexe em algo que já funciona?
3. **Dependências.** Precisa de outra peça antes?
4. **Custo.** P (dias, quase só JSON), M (uma a duas semanas), G (um marco inteiro).
5. **Alicerce.** Prepara o terreno para as ideias grandes, como os circuitos e o computador?

**Regras que valem para todas as ideias:**

- nada que pisca, nada de susto, nada de sangue;
- a morte nunca tira itens (RN02);
- toda novidade funciona **só com toque** (CA09);
- toda novidade respeita o modo calmo do site;
- toda mudança no formato do mundo salvo ganha uma migração (`migrateWorldSave`), e mundo
  antigo nunca se perde.

---

## 3. Ideias em ordem de prioridade

### Prioridade 0 — Firmar o que já existe

Antes de crescer, o que foi entregue hoje precisa estar redondo no tablet. É barato, e é o
que mais protege a experiência da criança.

| # | Ideia | Por quê | Custo |
| --- | --- | --- | --- |
| 0.1 | **Conferir no tablet, com o Pedro Henrique, tudo do M4 ao M7** | Até agora, só o M2 foi visto no navegador. Os testes provam as regras, não a sensação | P |
| 0.2 | **Aviso "Mundo salvo ✓"** discreto no canto, a cada salvamento | Dá segurança: a criança (e o pai) sabem que nada se perde | P |
| 0.3 | **Ler as dicas em voz alta** (síntese de voz do navegador), com botão de ligar | Para quem ainda não lê, as missões e os avisos passam a ser ouvidos | P |
| 0.4 | **Missões com imagem**: o ícone do item ao lado do texto | A criança reconhece "tronco", "mesa" e "picareta" pela figura | P |
| 0.5 | **Primeiro minuto guiado**: andar, olhar e quebrar, com setas na tela | A primeira sessão define se a criança volta | M |
| 0.6 | **Medir o desempenho no tablet** com 10 animais e 6 inimigos | Garante 60 quadros por segundo antes de pôr mais coisa no mundo | P |

### Prioridade 1 — Fazenda viva (sementes, plantação e colheita)

A fazenda é o coração calmo do jogo: é o que a criança faz de dia, sem pressa. Quase tudo
aqui é **só JSON**, porque o motor de plantação já existe.

| # | Ideia | Detalhe | Custo |
| --- | --- | --- | --- |
| 1.1 | **Mais plantações** | Batata, beterraba, abóbora, melancia, girassol, cana-de-açúcar. Cada uma é uma entrada em `crops.json`, um bloco e um item | P |
| 1.2 | **Comidas novas a partir delas** | Batata assada, sopa de beterraba, torta de abóbora, bolo (trigo, leite, ovo e açúcar da cana), suco de melancia | P |
| 1.3 | **Adubo** | Feito de ossos do esqueleto ou de folhas no compostor. Usado na planta, avança um estágio, com brilho suave | M |
| 1.4 | **Filhotes de animais** | Dar trigo a duas ovelhas faz nascer um filhote, que cresce em alguns minutos. Precisa de cerca para o cercado | M |
| 1.5 | **Regador e irrigação** | O regador molha uma área 3 × 3. Canais de água ficam bonitos na fazenda | M |
| 1.6 | **Missões da fazenda** | "Plante 5 cenouras", "Faça um cercado com 2 ovelhas", "Asse um bolo" | P |
| 1.7 | **Diário da fazenda** | Uma tela mostra o que está plantado e quanto falta, com uma barrinha por planta | M |

### Prioridade 2 — Tempo, calendário e as 4 estações

Hoje o jogo tem dia e noite. O próximo passo natural é contar os dias e girar as estações.
Isso dá ritmo à fazenda e é ótimo para ensinar o calendário.

| # | Ideia | Detalhe | Custo |
| --- | --- | --- | --- |
| 2.1 | **Relógio e dia na tela** | Um sol ou uma lua que andam num arco, mais "Dia 12 · Primavera" | P |
| 2.2 | **Calendário** | Contagem de dias no save (`WorldSave` versão 2, com migração). Uma estação a cada 7 dias de jogo dá um ano de 28 dias | M |
| 2.3 | **As 4 estações** | Veja a tabela abaixo | G |
| 2.4 | **Clima** | Chuva rega sozinha as plantações. Neve no inverno. Arco-íris depois da chuva. Tudo sem trovão assustador | M |
| 2.5 | **Estufa** | Plantar sob telhado de vidro protege do inverno: dá uso ao vidro que a fornalha já faz | M |
| 2.6 | **Datas especiais** | Aniversário do Pedro Henrique no calendário do jogo: bolo de presente e fogos na tela | P |

**Como cada estação muda o jogo:**

| Estação | Duração do dia | Plantas | Visual | Bichos |
| --- | --- | --- | --- | --- |
| Primavera | Dia normal | Crescem 1,5× mais rápido | Mais flores, grama verde-clara | Mais filhotes |
| Verão | Dia mais longo, noite curta | Crescimento normal; melancia e girassol só aqui | Céu mais azul | — |
| Outono | Dia normal | Abóbora só aqui; a colheita dá +1 | Folhas laranjas e amarelas | — |
| Inverno | Dia curto, noite mais longa | Não crescem fora da estufa | Neve no chão, o lago congela por cima | Mais inimigos à noite (com o Modo Paz, nenhum) |

**Como implementar:**

- As estações viram dados em `world.json` (nome, duração do dia, multiplicador de
  crescimento, cores).
- O visual usa uma cor de estação no material dos blocos. É o mesmo truque da luz do dia
  (`DaylightUniform`) e não pesa no tablet.
- O gelo do lago é um bloco que troca de lugar com a água na virada da estação.

### Prioridade 3 — Modos de jogo (vida e alimentação)

A pergunta "modo com vida e com alimentação?" toca numa regra de propósito: **hoje não existe
fome** (RN04), porque fome como punição frustra uma criança. A proposta é transformar isso
numa escolha, e não numa obrigação.

| Modo | Vida | Fome | Inimigos | Para quem |
| --- | --- | --- | --- | --- |
| **Criativo** | Não perde vida | Não existe | Desligados | Para construir sem limite: itens infinitos, voo, quebra instantânea |
| **Aventura** (o de hoje) | Corações que voltam sozinhos | Não existe | À noite, com Modo Paz opcional | O padrão |
| **Sobrevivência gentil** | Corações | **Barra de energia** | À noite | Para quando a criança quiser um desafio |

**Como a barra de energia funciona, sem punir:**

- Ela desce devagar, cerca de 1 ponto a cada 2 minutos de jogo.
- Com energia baixa, a vida **para de voltar sozinha**. Mesmo com a energia zerada, a vida
  **nunca cai** por causa disso.
- Pratos mais elaborados (bolo, ensopado) enchem mais que comida crua. Isso dá motivo para
  cozinhar e para cuidar da fazenda.
- O aviso é gentil: "Seu estômago roncou! Que tal comer algo?"

**Como implementar:**

- O modo fica no mundo (`WorldSave` versão 2), escolhido ao criar o mundo.
- O criativo ganha uma mochila com todos os blocos.
- A **decisão é do Pedro**: abrir ou não a sobrevivência gentil para o Pedro Henrique.

### Prioridade 4 — Inimigos noturnos: mais estratégia, sem mais medo

Os quatro inimigos já existem. Esta prioridade é sobre dar **ferramentas para a criança se
sentir capaz**, e não sobre deixar a noite mais difícil.

| # | Ideia | Detalhe | Custo |
| --- | --- | --- | --- |
| 4.1 | **Armadura** | De couro (da vaca), de ferro e de ouro. Cada peça tira 1 do dano. Aparece no herói e na mochila | M |
| 4.2 | **Escudo** | Segurar bloqueia flechas do esqueleto | M |
| 4.3 | **Dificuldade** | Fácil (inimigos tiram metade e são mais lentos), Normal e Paz. Igual ao Pedro Maker | P |
| 4.4 | **Mais luzes** | Lanterna, lâmpada (ver Prioridade 7) e fogueira. Também espantam inimigos | P |
| 4.5 | **Aviso de anoitecer** | "O sol está se pondo. Hora de acender tochas ou voltar para casa!" | P |
| 4.6 | **Chefe fofo de evento** | O Rei Slime aparece na lua cheia, a cada 8 noites. Derrotado, vira uma chuva de slimes pequenos e deixa uma coroa | G |
| 4.7 | **Ossos e drops úteis** | O esqueleto deixa ossos (viram adubo), e o espantalho deixa sementes raras | P |

### Prioridade 5 — Exploração e mundo maior

| # | Ideia | Detalhe | Custo |
| --- | --- | --- | --- |
| 5.1 | **Mapa** | Visto de cima, com o `mapColor` que todo bloco já tem. Mostra casa, cama e o herói | M |
| 5.2 | **Bússola "volta para casa"** | Uma seta aponta para a cama. Ótima para quem se perde | P |
| 5.3 | **Cavernas** | Túneis com minério e cristais que brilham (luz natural) | G |
| 5.4 | **Pesca** | Vara de pesca no lago: peixes para comer e tesouros (botas velhas, tesouro raro) | M |
| 5.5 | **Barco e cavalo** | Atravessar o lago e andar mais rápido | G |
| 5.6 | **Mundo maior e biomas** | Deserto, neve e floresta. Exige trocar o vetor único por chunks esparsos (ADR 001, Consequências) | G |

### Prioridade 6 — Plataforma: nuvem, família e jornada

| # | Ideia | Detalhe | Custo |
| --- | --- | --- | --- |
| 6.1 | **Sincronizar mundos entre aparelhos** | O contrato já está pronto (`docs/pedro-craft-api.md`). Falta o servidor e a tela do código | G |
| 6.2 | **Fotografar a construção** | Um botão de câmera salva uma imagem do mundo na galeria do site | M |
| 6.3 | **Conquistas na jornada do site** | Hoje cada missão já conta como desafio. Faltam selos: "Fazendeiro", "Construtor", "Explorador" | P |
| 6.4 | **Painel dos pais** | Tempo de jogo, missões feitas e limite de tempo opcional com aviso gentil ("Hora de descansar!") | M |
| 6.5 | **Cópia de segurança** | Exportar e importar o mundo como arquivo `.json`, antes de existir a nuvem | P |

> O multijogador continua fora, como diz a demanda original. Entra só com uma nova demanda e
> uma decisão de segurança (criança conversando com quem?).

### Prioridade 7 — Energia e circuitos (alicerce do computador)

**Atenção:** a demanda original do PedroCraft diz **"sem redstone"**. Esta prioridade
precisa de **uma nova demanda e de um ADR próprio**, aprovados pelo Pedro, antes de
começar.

A proposta é um sistema de **energia simples, visível e sem pegadinha**, mais parecido com
um kit de eletrônica do que com o redstone do Minecraft, que é difícil até para adultos.

**Peças propostas:**

| Peça | O que faz | Receita (ideia) |
| --- | --- | --- |
| **Painel solar** | Gera energia de dia | Vidro, ferro e cristal |
| **Dínamo de manivela** | Gera energia enquanto a criança gira (toque) | Ferro e graveto |
| **Bateria** | Guarda energia para a noite | Ferro e cobre |
| **Fio** | Leva a energia; acende quando passa corrente | Cobre |
| **Interruptor** | Liga e desliga com um toque | Graveto e pedra |
| **Botão** | Liga por 1 segundo | Pedra |
| **Sensor de presença** | Liga quando alguém chega perto | Ferro e vidro |
| **Temporizador** | Liga e desliga sozinho, num ritmo | Ferro e relógio |
| **Lâmpada** | Ilumina e espanta inimigos | Vidro e cobre |
| **Porta automática** | Abre com energia | Porta e ferro |
| **Bomba d'água** | Rega a plantação com energia | Balde e ferro |
| **Portas lógicas E, OU e NÃO** | Para os maiores: "a luz acende se for noite **E** tiver alguém" | Cobre e cristal |

**Como implementar, alinhado ao motor de hoje:**

- As peças são blocos com propriedades de energia no `blocks.json`: `source` (gera),
  `conductor` (conduz), `consumer` (usa) e `switch` (liga e desliga).
- Uma rede de energia (`engine/simulation/power-grid.ts`) recalcula **só onde algo mudou**,
  como a água faz hoje (`WaterFlow`). Nada varre o mundo inteiro.
- O alcance é limitado, por exemplo 32 blocos de fio por fonte. Assim a criança entende que
  o fio tem tamanho.
- O estado de cada bloco ligado vai para o save (`WorldSave` versão 2 ou 3, campo
  `blockStates`).
- Cobre e cristal entram como minérios novos na pedreira.

### Prioridade 8 — O computador e o Prompt

É a evolução mais rica e mais educativa. É também a que mais depende das outras: precisa da
energia (Prioridade 7) e combina com o calendário (Prioridade 2).

#### Como o computador funciona

1. A criança monta o **gabinete**, o **monitor** e o **teclado** (três blocos lado a lado) e
   liga tudo com **fio** a uma fonte de energia.
2. Tocar no monitor **liga o computador**. Aparece uma animação curta de partida: "PedroOS
   iniciando… ▓▓▓▓░░". Sem energia, a tela fica preta, e o jogo dá a dica "Ligue o
   computador numa fonte de energia".
3. Abre a tela do **Prompt**, por cima do mundo. O mundo **pausa**, como a mochila e a mesa
   já fazem (ADR 001, D7).
4. A criança digita **ou toca nos comandos de uma lista**. No tablet, a lista de botões é o
   jeito principal. Digitar é para quem quer.

```text
PedroOS 1.0 — Bem-vindo, Pedro!
Digite "ajuda" para ver os comandos.

pedro@fazenda:~$ hora
Dia 12, Primavera, 14:30. Faltam 3 minutos para anoitecer.

pedro@fazenda:~$ luzes ligar
💡 6 lâmpadas acesas.
```

#### Lista de comandos proposta

**Básicos (sempre disponíveis):**

| Comando | O que faz |
| --- | --- |
| `ajuda` | Lista os comandos, com exemplos |
| `limpar` | Limpa a tela |
| `hora` | Hora do jogo, dia, estação e quanto falta para anoitecer |
| `calendario` | Mostra o mês do jogo, com as datas especiais |
| `clima` | Como está o tempo e a previsão de amanhã |
| `quem-sou` | Nome do herói, dias jogados e missões cumpridas |
| `dizer <texto>` | O computador repete o texto (e lê em voz alta, se a voz estiver ligada) |
| `desligar` | Desliga o computador e volta ao mundo |

**Informação do mundo (só leitura):**

| Comando | O que faz |
| --- | --- |
| `onde-estou` | Coordenadas e a distância até a casa |
| `mapa` | Um mapinha em texto em volta do computador |
| `mochila` | O que tem na mochila |
| `missoes` | A missão da vez e as cumpridas |
| `vida` | Corações (e energia, no modo sobrevivência) |
| `fazenda` | Cada plantação e quanto falta para colher |
| `animais` | Quantos animais existem e onde, e quais ovelhas já têm lã |
| `energia` | Quanto a rede gera, guarda e gasta |

**Casa automática (age nos circuitos ligados ao computador):**

| Comando | O que faz |
| --- | --- |
| `luzes ligar` e `luzes desligar` | Todas as lâmpadas da rede |
| `porta abrir` e `porta fechar` | As portas automáticas |
| `regar` | Liga as bombas d'água por 30 segundos |
| `alarme ligar` | À noite, toca um som suave se um inimigo chegar perto da casa |
| `ao anoitecer luzes ligar` | Uma regra que fica guardada: o computador faz sozinho, toda noite |

**Programar de verdade (o grande salto educativo):**

| Comando | O que faz |
| --- | --- |
| `repetir 3 dizer oi` | Repetição |
| `se noite entao luzes ligar` | Condição |
| `programa novo <nome>` … `fim` | Cria um programa com vários comandos |
| `rodar <nome>` | Roda um programa salvo |
| `programas` | Lista os programas guardados no mundo |

É uma linguagem pequena, em português, no espírito do Logo: comandos de uma palavra,
`repetir`, `se … entao` e programas com nome. Ensina sequência, repetição e condição, que
são a base de toda programação.

**Diversão e aprendizado:**

| Comando | O que faz |
| --- | --- |
| `tabuada 7` | Mostra a tabuada |
| `conta` | Uma conta para resolver; acertar dá uma estrela |
| `soletrar <palavra>` | Soletra letra por letra, com voz |
| `desenhar casa` | Desenhos em arte de texto (casa, ovelha, árvore) |
| `musica` | Toca uma melodia com os sons do jogo; `musica do a mi sol` toca as notas pedidas |
| `historia` | Uma historinha curta da fazenda |
| `piada` | Uma piada para criança |

**Especiais e surpresas:**

| Comando | O que faz |
| --- | --- |
| `fogos` | Fogos de artifício no céu, sem som alto e sem piscar |
| `arco-iris` | Um arco-íris aparece no céu |
| `danca` | O herói dança por alguns segundos |
| `presente` | Um presente por dia de jogo (uma semente rara, uma flor) |
| `oi` e `pedro` | O computador responde com carinho e com o nome da criança |

**Comandos de responsável (protegidos por senha dos pais):**

| Comando | O que faz |
| --- | --- |
| `modo paz ligar` | O mesmo Modo Paz das configurações |
| `tempo-limite 30` | Avisa depois de 30 minutos de jogo |
| `teleporte casa` | Leva o herói para a cama (para quando ele se perder) |

#### Como implementar com segurança

- **Nada de `eval`:** cada comando é uma função registrada numa lista fechada
  (`engine/computer/commands.ts`), com um analisador simples de palavras. Comando
  desconhecido responde "Não conheço esse comando. Digite ajuda."
- Os textos de ajuda, as piadas, as histórias e os desenhos ficam num JSON novo
  (`computer.json`), com `schemaVersion`, como todo o conteúdo.
- Os programas da criança vão para o save do mundo, com limite de tamanho e de passos por
  execução: um `repetir 99999` não trava o jogo.
- **Acessibilidade:** fonte grande, alto contraste, comandos tocáveis em botões e voz
  opcional. Uma ligação natural com a prancha de falar do site seria comandos em figuras.
  Essa ligação é uma decisão à parte, porque a prancha é a prioridade máxima do site e não
  pode ser afetada.

---

## 4. Roteiro de desenvolvimento, fase a fase

Cada fase é uma demanda, com commit por marco, testes, build e merge na `staging`. As fases
seguem a ordem das dependências.

| Fase | Nome | Conteúdo | Depende de | Tamanho |
| --- | --- | --- | --- | --- |
| **F0** | Firmar | 0.1 a 0.6: conferência no tablet, "mundo salvo ✓", voz, missões com ícone, primeiro minuto, desempenho | — | P |
| **F1** | Fazenda viva | 1.1, 1.2, 1.6 (só JSON) e depois 1.3, 1.4, 1.5 e 1.7 | F0 | M |
| **F2** | Calendário e estações | 2.1 a 2.6, com `WorldSave` versão 2 (dia, estação) e a primeira migração real | F1 (plantas sentem a estação) | G |
| **F3** | Modos de jogo | Criativo, Aventura e Sobrevivência gentil (no `WorldSave` versão 2) | F2 (comidas e estações dão sentido à energia) | M |
| **F4** | Noites mais justas | 4.1 a 4.7: armadura, escudo, dificuldade, luzes, aviso e chefe de evento | F3 | M |
| **F5** | Exploração | 5.1, 5.2, 5.4 e depois 5.3 e 5.5 | F4 | G |
| **F6** | Energia e circuitos | Prioridade 7 inteira; nova demanda e ADR 002 | F2 (dia e noite para o painel solar) | G |
| **F7** | Computador e Prompt | Prioridade 8: comandos básicos, de leitura e da casa, depois os de programar | F6 | G |
| **F8** | Nuvem e família | 6.1 a 6.5 | Pode correr em paralelo depois da F0 | G |

**Marcos sugeridos dentro das fases grandes:**

- **F2:**
  - F2.1: relógio e calendário;
  - F2.2: estações no crescimento;
  - F2.3: visual das estações;
  - F2.4: clima.
- **F6:**
  - F6.1: fio, interruptor e lâmpada;
  - F6.2: fontes e bateria;
  - F6.3: sensores, temporizador e porta automática;
  - F6.4: portas lógicas.
- **F7:**
  - F7.1: ligar o computador e os comandos básicos;
  - F7.2: os comandos de leitura do mundo;
  - F7.3: a casa automática;
  - F7.4: programar (`repetir`, `se`, programas).

---

## 5. Decisões que dependem do Pedro

Antes de começar as fases, estas escolhas são do Pedro:

1. **Sobrevivência gentil:** abrir para o Pedro Henrique, ou deixar só Criativo e Aventura?
2. **Circuitos e computador:** aprovar uma nova demanda que revoga o "sem redstone" da demanda
   original, no formato de energia simples proposto aqui?
3. **Voz:** ligar a leitura em voz alta por padrão, ou deixar como opção nas configurações?
4. **Aniversário e nome:** usar o nome e a data de aniversário do Pedro Henrique dentro do
   jogo? São dados pessoais e ficam só no aparelho.
5. **Tempo-limite e painel dos pais:** é desejado? Com qual senha e qual limite padrão?

Pendências que vêm de hoje e continuam valendo:

- aceitar os +0,47 kB do bundle inicial (CA07);
- o limite de 5 mundos;
- conferir o M4 ao M7 no tablet.
