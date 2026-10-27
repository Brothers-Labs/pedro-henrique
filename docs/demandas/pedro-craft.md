---
demandId: pedro-craft
type: epic
title: PedroCraft — jogo de blocos estilo Minecraft com dados em JSON
priority: high
branchPattern: feat
repositories:
  - path: Brothers-Labs/pedro-henrique
    role: frontend
    branchBase: staging
    prTarget: main
allowPush: true
allowPullRequest: false
---

# PedroCraft — jogo de blocos estilo Minecraft com dados em JSON

## Identificador

`pedro-craft`

## Contexto

O site do Pedro Henrique já tem três jogos 3D feitos em three.js: Pedro Maker, Pedro Kart e
Pedro Flash. O Pedro pediu um jogo de blocos em primeira pessoa, no estilo do Minecraft, num
mundo aberto pequeno, do tamanho de uma fazenda média. O jogo é usado por uma criança
autista, no tablet e no computador.

Por enquanto o jogo é só frontend. O backend virá depois. Por isso todo o conteúdo e todo o
estado salvo são JSON, com contrato estável e lidos por portas trocáveis.

## Problema

Não existe no site um jogo de construção livre. Também não existe um conteúdo de jogo
pronto para ir ao servidor sem reescrita.

## Objetivo

Entregar o PedroCraft em `/jogos/pedro-craft`. Nele a criança:

- colhe recursos: madeira, pedra, água, minérios e plantações;
- constrói;
- fabrica ferramentas e armas;
- cuida de uma fazenda;
- enfrenta inimigos fofos.

Todo o conteúdo vem de JSON validado, e o mundo salvo é um JSON pronto para sincronizar
com um backend futuro.

## Projetos envolvidos

- `Brothers-Labs/pedro-henrique` (frontend Angular 20 + three.js).

## Jornada esperada

1. A criança abre Jogos e toca no cartão do PedroCraft.
2. Na tela inicial, toca em "Novo mundo", dá um nome ao mundo (ou aceita o sugerido) e
   entra no jogo.
3. Ela anda pela fazenda, quebra troncos, junta madeira e segue as missões, por exemplo
   "Faça uma mesa de trabalho".
4. Ela fabrica ferramentas, quebra pedra, planta trigo, pega água com o balde e constrói
   uma casa.
5. À noite aparecem inimigos fofos, a não ser que o Modo Paz esteja ligado. Ela se defende
   com a espada ou dorme na cama.
6. Ao sair, o mundo está salvo. "Continuar" a leva de volta ao mesmo lugar.

## Requisitos obrigatórios

- [ ] RO01 — O mundo tem 96 × 96 blocos de chão e 48 de altura, gerado por semente, com
  colinas, lago, riacho, bosque, pedreira com minérios, clareira de fazenda e casa inicial.
- [ ] RO02 — Andar, olhar, pular e nadar, com colisão contra os blocos. Controles de teclado
  e mouse e controles de toque.
- [ ] RO03 — Quebrar blocos leva tempo, que depende da dureza e da ferramenta. O drop vai
  para o inventário. Um bloco que exige ferramenta mínima não dá item sem ela.
- [ ] RO04 — Colocar blocos, com barra de 9 itens e inventário de 27 espaços.
- [ ] RO05 — Fabricação com grade 2 × 2 no inventário e 3 × 3 na mesa, livro de receitas
  com fabricação em um toque, e fornalha com combustível.
- [ ] RO06 — Ferramentas (picareta, machado, pá, enxada e espada) em quatro níveis, arco e
  flechas, balde e tesoura, com durabilidade.
- [ ] RO07 — Água que o balde pega e coloca, que se espalha no máximo 4 blocos e onde o
  herói nada.
- [ ] RO08 — Fazenda: enxada, terra arada, trigo e cenoura em estágios, crescimento mais
  rápido com água por perto, mudas que viram árvore e maçã.
- [ ] RO09 — Animais passivos (galinha, vaca e ovelha) e inimigos fofos (slime de lama,
  zumbi-espantalho, aranha-botão e esqueleto-arqueiro), com comportamentos em máquina de
  estados.
- [ ] RO10 — Vida em corações, comida que recupera vida, ciclo de dia e noite, cama que
  muda o ponto de volta e Modo Paz.
- [ ] RO11 — Todo o conteúdo em JSON em `public/data/pedro-craft/`, com `schemaVersion`,
  ids estáveis, JSON Schema e checagem de integridade referencial.
- [ ] RO12 — Mundo salvo como JSON (`WorldSave`) com só as diferenças, migração por versão,
  limpeza de dados corrompidos e salvamento automático no IndexedDB.
- [ ] RO13 — Telas: início, meus mundos, jogar e configurações. Cartão em Jogos, rota no
  site e entrada no menu.
- [ ] RO14 — Contrato da API futura em `docs/pedro-craft-api.md`.

## Requisitos opcionais

- [ ] ROP01 — Missões guiadas, como "Quebre um tronco" e "Faça uma picareta", que contam
  como desafios na jornada de jogos do site.

## Critérios de aceite

- [ ] CA01 — A mesma semente gera o mesmo mundo, bloco a bloco.
- [ ] CA02 — Um JSON com referência quebrada falha na carga, com mensagem que cita o
  arquivo e o id.
- [ ] CA03 — Salvar e carregar devolve o mesmo mundo: blocos, inventário, posição,
  plantações e baús.
- [ ] CA04 — Um save corrompido não derruba a tela: o jogo avisa e oferece outro mundo.
- [ ] CA05 — Com o Modo Paz ligado, nenhum inimigo nasce.
- [ ] CA06 — Morrer devolve o herói para casa com todos os itens.
- [ ] CA07 — O bundle inicial do site não cresce.
- [ ] CA08 — Todos os testes do projeto passam e o build de produção conclui.
- [ ] CA09 — É jogável só com toque.

## Regras de negócio

- RN01 — O Modo Paz começa ligado quando o modo calmo do site está ligado.
- RN02 — A morte não tira itens. O herói volta à cama ou ao ponto inicial.
- RN03 — Inimigos só nascem à noite, longe do herói e longe de tochas, até um teto
  configurado. Ao amanhecer, eles "voltam para casa", isto é, somem com uma nuvem de
  fumaça.
- RN04 — A fome não existe como punição. Comer só recupera vida.
- RN05 — O save guarda ids de texto, nunca os números internos dos blocos.

## Restrições

- Sem dependência nova. three.js já está no projeto.
- Sem multijogador, redstone, Nether, encantamento, mundo infinito ou mods.
- Sem efeitos que piscam, sangue ou sustos.
- TypeScript strict, sem `any`.

## Cenários de teste

Os cenários derivam dos critérios de aceite, mais as regras de cada sistema:

- semente determinística;
- quebra com e sem a ferramenta certa;
- inventário cheio e parcial;
- receitas com forma, inclusive espelhadas, e sem forma;
- durabilidade;
- limite da água;
- crescimento com e sem água;
- estados das criaturas;
- Modo Paz;
- ida e volta do save;
- migração;
- save corrompido.

## Branch base

`staging`

## Padrão de branch

`feat/pedro-craft`

## Padrão de commit

`feat: PedroCraft M<n> — <marco>`, em português, um commit por marco.

## Destino do Pull Request

`staging` → `main`. O `gh` não está instalado, então o PR é aberto pelo Pedro.
